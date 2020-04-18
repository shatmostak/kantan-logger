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
    prettyText = true
  } = {}) {
    this.title = title
    this.location = location
    this.directory = directory
    this.logLevels = logLevels
    this.logLevelWebhooks = logLevelWebhooks
    this.useTimeInTitle = useTimeInTitle
    this.useDateDirectories = useDateDirectories
    this.daysTillDelete = daysTillDelete
    this.prettyJSON = prettyJSON
    this.prettyText = prettyText
    this.paused = false
    this.queue = []
    this.backQueue = []
    this.now = new Date()
    this.dateStampString = 'mm-dd-yy'
    this.timeStampString = 'HH.MM.ss.l'
    this.dateStamp = dateformat(this.now, this.dateStampString)
    this.logTextString = useDateDirectories ? this.timeStampString : `${this.dateStampString} ${this.timeStampString}`
    this.timeStamp = dateformat(this.now, this.timeStampString)
    this.logPath = path.normalize(`${path.dirname(require.main.filename)}/${location}${directory}`)
    this.logPathWithDate = useDateDirectories ? path.normalize(`${this.logPath}/${this.dateStamp}`) : this.logPath
    this.createFolder()
    this.removeOldLogs()
    this.setlogLevels()
    this.startLog()
    // console.log(this)
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

  cutInQueue({ logTitle, logText }) {
    this.backQueue.unshift({ logTitle, logText })
  }

  pushToQueue({ logTitle, logText }) {
    if (this.paused) {
      this.backQueue.push({ logTitle, logText })
    } else {
      this.queue.push({ logTitle, logText })
      this.appendToLogs()
    }
  }

  appendToLogs() {
    while (this.queue.length) {
      const { logTitle, logText } = this.queue.shift()
      fs.appendFileSync(path.normalize(`${this.logPathWithDate}/${logTitle}.log`), `${logText.replace('\\n"', '": ')}\n`)
    }
  }

  setlogLevels() {
    this.logLevels.forEach(level => {
      this[level] = async (...args) => {
        const levelText = `${level.toUpperCase()}:`
        if (typeof this.logLevelWebhooks[level] !== 'undefined' && typeof args[0] === 'object') {
          this.paused = true
          const params = args.shift()
          params.level = level
          params.message = this.setLogMessage(args)
          const { logTitle, logText } = this.setLogTitleText([levelText, ...args])
          const webhookResponse = await this.webhook(params)
          this.cutInQueue(this.setLogTitleText([`WEBHOOK RESPONSE ${levelText}`, webhookResponse]))
          this.cutInQueue({ logTitle, logText })
          this.resumeQueue()
        } else {
          this.log(levelText, ...args)
        }
      }
    })
  }

  async webhook(params) {
    const { level } = params
    let webhookLog = ''
    try {
      const response = await axios.post(this.logLevelWebhooks[level], params)
      webhookLog = `${this.logLevelWebhooks[level]} - ${response.data}`
    } catch (error) {
      webhookLog = `${error}`
    }
    return webhookLog
  }

  startLog() {
    if (!this.useTimeInTitle || !this.useDateDirectories) {
      this.log(`---------- ========== [${dateformat(new Date(), this.logTextString)}] ========== ----------`)
    }
  }

  setLogTitleText(logs) {
    let logText = `[${dateformat(new Date(), this.logTextString)}] `
    let logTitle = `${this.title}`
    this.createFolder()
    if (this.useTimeInTitle || !this.title.length) {
      logTitle += ` ${this.dateStamp} ${this.timeStamp}`
    }
    logText += this.setLogMessage(logs)
    return { logText, logTitle }
  }

  log(...logs) {
    this.pushToQueue(this.setLogTitleText(logs))
  }

  // eslint-disable-next-line class-methods-use-this
  create(options) {
    return new Kantan(options)
  }

  createFolder() {
    if (!fs.existsSync(this.logPathWithDate)) {
      fs.mkdirSync(this.logPathWithDate, { recursive: true })
    }
  }

  setLogMessage(logs) {
    let logText = ''
    logs.forEach(log => {
      const stringifyArgs = this.prettyJSON ? [log, null, 2] : [log]
      const startWith = /\n$/.test(logText) ? '' : ' '
      if (typeof log === 'string') {
        logText += `${startWith}${this.prettyText ? log : JSON.stringify(...stringifyArgs).replace(/^"|"$/gm, '')}`
      } else {
        logText += `${startWith}${log ? JSON.stringify(...stringifyArgs) : 'undefined'}`
      }
    })
    return logText.trim()
  }
}
module.exports = new Kantan()
