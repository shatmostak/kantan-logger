/*
 * @name       kantan-logger
 * @author     Will Shostak <william.shostak@gmail.com> - Matt Shostak <matthewpshostak@gmail.com>
 * @license    ISC License
 */
const findRemoveSync = require('find-remove')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const dateformat = require('dateformat')

const handler = {
  get(target, propKey) {
    if (typeof target[propKey] === 'undefined') {
      target[propKey] = target.log
    }

    return target[propKey].bind(target)
  }
}

class Kantan {
  constructor({
    title = '',
    location = '',
    directory = 'logs',
    logLevels = ['success', 'verbose', 'info', 'warning', 'error'],
    logLevelWebhooks = {},
    useTimeInTitle = true,
    useDateDirectories = true,
    daysTillDelete = 7,
    prettyJSON = true,
    prettyText = true,
    showMemoryUsage = false,
    echoToConsole = false,
    useJSON = false
  } = {}) {
    this.title = title
    this.location = location
    this.directory = directory
    this.logLevels = [...new Set(logLevels), 'log']
    this.logLevelWebhooks = logLevelWebhooks
    this.useTimeInTitle = useTimeInTitle
    this.useDateDirectories = useDateDirectories
    this.daysTillDelete = daysTillDelete
    this.prettyJSON = prettyJSON
    this.prettyText = prettyText
    this.showMemoryUsage = showMemoryUsage
    this.echoToConsole = echoToConsole
    this.useJSON = useJSON
    this.paused = false
    this.queue = []
    this.backQueue = []
    this.now = new Date()
    this.dateStampString = 'mm-dd-yy'
    this.timeStampString = 'HH.MM.ss.l'
    this.dateStamp = dateformat(this.now, this.dateStampString)
    this.logTextString = useDateDirectories
      ? this.timeStampString
      : `${this.dateStampString} ${this.timeStampString}`
    this.timeStamp = dateformat(this.now, this.timeStampString)
    this.logPath = path.normalize(`${path.dirname(require.main.filename)}/${location}${directory}`)
    this.logPathWithDate = useDateDirectories
      ? path.normalize(`${this.logPath}/${this.dateStamp}`)
      : this.logPath
    this.createFolder()
    this.removeOldLogs()
    this.setLogLevels()
    this.startLog()
  }

  removeOldLogs() {
    findRemoveSync(this.logPath, {
      age: {
        seconds: this.daysTillDelete * 86400 // One day.
      },
      extensions: ['.log'],
      dir: '*'
    })
  }

  resumeQueue() {
    this.queue = [...this.queue, ...this.backQueue]
    this.backQueue = []
    this.paused = false
    this.appendToLogs()
  }

  cutInQueue(args) {
    this.backQueue.unshift(args)
  }

  pushToQueue(args) {
    if (this.paused) {
      this.backQueue.push(args)
    } else {
      this.queue.push(args)
      this.appendToLogs()
    }
  }

  appendToLogs() {
    while (this.queue.length) {
      const {
        logTitle, logText, logObject, logArgs
      } = this.queue.shift()
      if (this.useJSON && logObject) {
        const file = path.normalize(`${this.logPathWithDate}/${logTitle}.json`)
        let logData = [logObject]
        if (fs.existsSync(file)) {
          logData = [...JSON.parse(fs.readFileSync(file, 'utf8')), logObject]
        }
        fs.writeFileSync(file, this.setLogMessage([logData]))
      } else if (!this.useJSON && logText) {
        fs.appendFileSync(
          path.normalize(`${this.logPathWithDate}/${logTitle}.log`),
          `${logText.replace('\\n"', '": ')}\n`
        )
      }
      if (this.echoToConsole) {
        // eslint-disable-next-line no-console
        console.log(logArgs || logText)
      }
    }
  }

  setLogLevels() {
    this.logLevels.forEach(logLevel => {
      this[logLevel] = async (...args) => {
        const levelText = `${logLevel.toUpperCase()}:`
        const { logTitle, logText } = this.setLogTitleText([levelText, ...args])
        const logArgs = JSON.parse(JSON.stringify(args))
        const logOutput = {
          logTitle,
          logText,
          logLevel,
          logObject: {
            level: logLevel,
            time: dateformat(new Date(), this.logTextString),
            channel: this.title,
            messages: logArgs
          },
          logArgs
        }
        if (this.showMemoryUsage) {
          logOutput.logObject.memoryUsage = process.memoryUsage()
        }
        if (typeof this.logLevelWebhooks[logLevel] !== 'undefined' && typeof args[0] === 'object') {
          this.paused = true
          const params = args.shift()
          params.level = logLevel
          params.message = this.setLogMessage(args)
          const webhookResponse = await this.webhook(params)
          this.cutInQueue({
            ...logOutput,
            ...this.setLogTitleText([`WEBHOOK RESPONSE ${levelText}`, webhookResponse])
          })
          this.cutInQueue(logOutput)
          this.resumeQueue()
        } else {
          this.pushToQueue(logOutput)
        }
      }
    })
  }

  async webhook(params) {
    const { level } = params
    let webhookLog = ''
    try {
      const response = await axios.post(this.logLevelWebhooks[level], params)
      webhookLog = `${this.logLevelWebhooks[level]} - '${response.data}'`
    } catch (error) {
      const { status, statusText, data } = error.response || {
        data: error.message,
        statusText: 'Service Unavailable',
        status: 503
      }
      const errorMessage = data && typeof data === 'string' ? `'${data}' ` : ''
      webhookLog = `${errorMessage}${statusText} (${status})`
    }
    return webhookLog
  }

  startLog() {
    if (!this.useTimeInTitle || !this.useDateDirectories) {
      this.pushToQueue({
        logTitle: this.title,
        logText: `---------- ========== [${dateformat(new Date(), this.logTextString)}] ========== ----------`,
        logObject: {
          level: '** Time Marker **',
          time: dateformat(new Date(), this.logTextString),
          channel: this.title
        }
      })
    }
  }

  setLogTitleText(logs) {
    let logText = `[${dateformat(new Date(), this.logTextString)}] `
    let logTitle = `${this.title}`
    this.createFolder()
    if (this.useTimeInTitle || !this.title.length) {
      logTitle += ` ${this.dateStamp} ${this.timeStamp}`
    }
    if (this.showMemoryUsage) {
      logText += `(${(process.memoryUsage().rss / 8192).toFixed(2)} MB) `
    }
    logText += this.setLogMessage(logs)
    return { logText, logTitle }
  }

  // eslint-disable-next-line class-methods-use-this
  create(options) {
    return new Proxy(new Kantan(options), handler)
    // return new Kantan(options)
  }

  createFolder() {
    if (!fs.existsSync(this.logPathWithDate)) {
      fs.mkdirSync(this.logPathWithDate, { recursive: true })
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getCircularReplacer() {
    const seen = new WeakSet()
    return (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return
        }
        seen.add(value)
      }
      // eslint-disable-next-line consistent-return
      return value
    }
  }

  setLogMessage(logs) {
    let logText = ''
    logs.forEach(log => {
      const stringifyArgs = this.prettyJSON
        ? [log, this.getCircularReplacer(), 2]
        : [log, this.getCircularReplacer()]
      const startWith = /\n$/.test(logText) ? '' : ' '
      if (typeof log === 'string') {
        logText += `${startWith}${
          this.prettyText ? log : JSON.stringify(...stringifyArgs).replace(/^"|"$/gm, '')
        }`
      } else {
        logText += `${startWith}${log ? JSON.stringify(...stringifyArgs) : 'undefined'}`
      }
    })
    return logText.trim()
  }
}

module.exports = new Proxy(new Kantan(), handler)
