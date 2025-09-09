/*
 * @name       kantan-logger
 * @author     Will Shostak <william.shostak@gmail.com> - Matt Shostak <matthewpshostak@gmail.com>
 * @license    ISC License
 */
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const dateformat = require('dateformat')

// Proxy handler enables dynamic log level methods (e.g., logger.custom() -> logger.log())
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
    this.logLevels = [...new Set(logLevels), 'log'] // Ensure 'log' is always available
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

    // Initialize timestamps
    this.now = new Date()
    this.dateStampString = 'mm-dd-yy'
    this.timeStampString = 'HH.MM.ss.l'
    this.dateStamp = dateformat(this.now, this.dateStampString)
    this.logTextString = useDateDirectories
      ? this.timeStampString
      : `${this.dateStampString} ${this.timeStampString}`
    this.timeStamp = dateformat(this.now, this.timeStampString)

    // Build log paths
    this.logPath = path.join(`${path.dirname(require.main.filename)}/${location}${directory}`)
    this.logPathWithDate = useDateDirectories
      ? path.join(`${this.logPath}/${this.dateStamp}`)
      : this.logPath

    this.createFolder()
    this.removeOldLogs()
    this.setLogLevels()
    this.startLog()
  }

  removeOldLogs() {
    const days = Number.isFinite(this.daysTillDelete) ? Math.max(0, this.daysTillDelete) : 7
    const cutoffMs = Date.now() - days * 86400 * 1000

    if (fs.existsSync(this.logPath)) {
      try {
        this.pruneOldEntries(this.logPath, cutoffMs)
      } catch (e) {
        if (this.echoToConsole) {
          console.error('removeOldLogs error:', e)
        }
      }
    }
  }

  // Recursively remove old files/dirs but preserve current date directory structure
  pruneOldEntries(dir, cutoffMs) {
    let entries = []
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch (e) {
      if (this.echoToConsole) {
        console.error(`pruneOldEntries: readdir failed for ${dir}: ${e.message}`)
      }
    }

    const currentDateDirAbs = path.resolve(this.logPathWithDate)

    // eslint-disable-next-line no-restricted-syntax
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      const fullAbs = path.resolve(full)
      let toConsole = false
      let stat

      try {
        stat = fs.lstatSync(fullAbs) // Use lstat to not follow symlinks
      } catch (e) {
        toConsole = `pruneOldEntries: stat failed for ${fullAbs}: ${e.message}`
      }

      if (stat) {
        // Remove old symlinks without following them
        if (stat.isSymbolicLink()) {
          if (stat.mtimeMs < cutoffMs) {
            try {
              fs.unlinkSync(fullAbs)
            } catch (e) {
              toConsole = `pruneOldEntries: unlink symlink failed for ${fullAbs}: ${e.message}`
            }
          }
        } else if (stat.isDirectory()) {
          if (fullAbs === currentDateDirAbs) {
            // Clean contents of current date dir but don't remove the dir itself
            this.pruneOldEntries(fullAbs, cutoffMs)
          } else if (stat.mtimeMs < cutoffMs) {
            // Remove old directories completely
            try {
              fs.rmSync(fullAbs, { recursive: true, force: true })
            } catch (e) {
              toConsole = `pruneOldEntries: rm dir failed for ${fullAbs}: ${e.message}`
            }
          } else {
            // Clean newer directories and try to remove if empty
            this.pruneOldEntries(fullAbs, cutoffMs)
            try {
              fs.rmdirSync(fullAbs)
            } catch (_) {
              // not empty or in use; keep
            }
          }
        } else if (stat.mtimeMs < cutoffMs) {
          // Remove old files
          try {
            fs.unlinkSync(fullAbs)
          } catch (e) {
            toConsole = `pruneOldEntries: unlink failed for ${fullAbs}: ${e.message}`
          }
        }
      }

      if (toConsole && this.echoToConsole) {
        console.error(toConsole)
      }
    }
  }

  // Resume queue processing by merging backQueue with main queue
  resumeQueue() {
    this.queue = [...this.queue, ...this.backQueue]
    this.backQueue = []
    this.paused = false
    this.appendToLogs()
  }

  // Add item to front of backQueue
  cutInQueue(args) {
    this.backQueue.unshift(args)
  }

  // Add to appropriate queue based on paused state
  pushToQueue(args) {
    if (this.paused) {
      this.backQueue.push(args)
    } else {
      this.queue.push(args)
      this.appendToLogs()
    }
  }

  // Process all queued log entries
  appendToLogs() {
    while (this.queue.length) {
      const {
        logTitle, logText, logObject, logArgs
      } = this.queue.shift()
      const useJSON = this.useJSON && logObject
      const ext = useJSON ? 'jsonl' : 'log'
      const filePath = path.join(`${this.logPathWithDate}/${logTitle}.${ext}`)
      const payload = useJSON
        ? `${JSON.stringify(logObject, this.getCircularReplacer())}\n`
        : `${logText.replace('\\n"', '": ')}\n`

      fs.appendFileSync(filePath, payload)

      if (this.echoToConsole) {
        // eslint-disable-next-line no-console
        console.log(logArgs || logText)
      }
    }
  }

  // Create dynamic log level methods
  setLogLevels() {
    this.logLevels.forEach(logLevel => {
      this[logLevel] = (...args) => {
        const levelText = `${logLevel.toUpperCase()}:`
        const { logTitle, logText } = this.setLogTitleText([levelText, ...args])
        const logArgs = JSON.parse(JSON.stringify(args))
        const now = new Date()
        const timestamp = now.getTime()
        const logOutput = {
          logTitle,
          logText,
          logLevel,
          logObject: {
            level: logLevel,
            time: this.useJSON ? timestamp : dateformat(new Date(), this.logTextString),
            channel: this.title,
            messages: logArgs
          }
        }

        this.pushToQueue(logOutput)

        // Send webhook if configured for this log level
        const webhookUrl = this.logLevelWebhooks[logLevel]
        if (webhookUrl && typeof args[0] === 'object') {
          const [firstArg, ...rest] = logArgs
          const params = {
            ...firstArg,
            level: logLevel,
            message: this.setLogMessage(rest)
          }

          this.webhook(params).catch(err => {
            if (this.echoToConsole) {
              console.error('Webhook failed:', err)
            }
          })
        }
      }
    })
  }

  // Send HTTP webhook with error handling
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

  // Add initial time marker log entry
  startLog() {
    if ((!this.useTimeInTitle || !this.useDateDirectories) && !this.useJSON) {
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

  // Build log title and formatted text with timestamp
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

  // Factory method to create new logger instances
  // eslint-disable-next-line class-methods-use-this
  create(options) {
    return new Proxy(new Kantan(options), handler)
  }

  // Ensure log directory exists
  createFolder() {
    if (!fs.existsSync(this.logPathWithDate)) {
      fs.mkdirSync(this.logPathWithDate, { recursive: true })
    }
  }

  // Handle circular references in JSON serialization
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

  // Format multiple log arguments into a single message string
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
