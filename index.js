/*
 * @name       kantan-logger
 * @version    1.0.8
 * @date       2019-11-27
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
    daysTillDelete = 7
  } = {}) {
    this.title = title
    this.location = location
    this.directory = directory
    this.logLevels = logLevels
    this.logLevelWebhooks = logLevelWebhooks
    this.useTimeInTitle = useTimeInTitle
    this.useDateDirectories = useDateDirectories
    this.daysTillDelete = daysTillDelete
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
          params.message = Kantan.setlogmessage(args)
          const { logTitle, logText } = this.setLogTitleText([levelText, ...args])
          const webhookResponse = await this.webhook(params)
          this.cutInQueue(this.setLogTitleText([`WEBHOOK RESPONSE ${levelText}`, webhookResponse]))
          this.cutInQueue({ logTitle, logText })
          this.resumeQueue()
        } else {
          this.log([levelText, ...args])
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
      this.log([`${this.dateStamp} ${this.timeStamp}`, `---------- ========== [${dateformat(new Date(), this.logTextString)}] ========== ----------`])
    }
  }

  setLogTitleText(log) {
    let logText = `[${dateformat(new Date(), this.logTextString)}] `
    let logTitle = `${this.title}`
    this.createFolder()
    if (this.useTimeInTitle || !this.title.length) {
      logTitle += ` ${this.dateStamp} ${this.timeStamp}`
    }
    logText += Kantan.setlogmessage(log)
    return { logText, logTitle }
  }

  log(log) {
    this.pushToQueue(this.setLogTitleText(log))
  }

  // eslint-disable-next-line class-methods-use-this
  create(options) {
    return new Kantan(options)
  }

  createFolder() {
    if (!fs.existsSync(this.logPathWithDate)) {
      fs.mkdirSync(this.logPathWithDate)
    }
  }

  static setlogmessage(args) {
    const logs = Array.isArray(args) ? args : [args]
    let logText = ''
    logs.forEach(log => {
      logText += `${JSON.stringify(log).replace(/^"|"$/gm, '')} `
    })
    return logText
  }
}
module.exports = new Kantan()
