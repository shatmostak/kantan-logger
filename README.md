# Kantan Logger

A simple but hopefully versitale logger.
Kantan Logger creates a log directory. In that directory Kantan Logger creates a directory with the date *(MM.DD.YY)*. Logs are then titled with a time stamp *(HH.MM.SS.MMM)* of when it was created. 

## Installing

Install via npm
```
npm i kantan-logger
```
or yarn
```
yarn add kantan-logger
```

## Getting Started
```
// node/common.js style 
const kantan = require('kantan-logger')
```

## Usage

```
kantan.log(obj1 [, obj2, ..., objN])
```

__obj1 ... objN__ - A list of JavaScript objects to write to the log file. The string representations of each of these objects are appended together in the order listed and written.

To start a new instance of the logger or a new file to write:
```
kantan.create(obj1)
```
__obj1__ - Object with the optional properties; *title*, *location* and *directory*.

### Options

Option | Default | Notes
--- | --- | ---
title | '' | *Prepends the title to the log file name*
location | '' | *Relative from the directory from which your main file was run*
directory | 'logs' | *Name of the logs directory*
logLevels | ['success', 'verbose', 'info', 'warning', 'error'] | *Names of the log levels you require*
logLevelWebhooks | {} | *Object where property is the log level you want to make the webhook on, and the value is the URL of where to push*
useTimeInTitle | true | *Use time in the title of the log file*
useDateDirectories | true | *Separate log files in date directories*
daysTillDelete | 7 | *Number of days of logs to keep*
prettyJSON | true | *Prettify JSON*
prettyText | true | *Formatted text without string literals*
Example:
```
kantan.create({
    title: 'TK-3623',
    location: 'var/',
    directory: 'my_logs',
    logLevels: ['ichi', 'ni', 'san', 'shi', 'go'],
    logLevelWebhooks: {
      ichi: 'http://www.mysite.com/ichi-data-goes-here'
    },
    useTimeInTitle: false,
    useDateDirectories: true,
    daysTillDelete: 14
})
```
### Use Case
For example:  You have an app that is always listening for a post, and on each post we create a new log file.

```
// server related requires and setup
const express = require('express')
const kantan = require('kantan-logger')

const port = process.env.PORT || 3001
const app = express()

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

// start listening on port
app.listen(port, () => {
  console.log(`port up on ${port}`)
})

// starts listening for POSTs
app.post('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end('Thanks')
  // call new instance of kantan for this post
  const logger = kantan.create({
    // tells the logger to create logfile beginning with req.body.ticketId
    title: req.body.ticketId,
    logLevels: ['ichi', 'ni', 'san', 'shi', 'go'],
    logLevelWebhooks: {
      ichi: 'http://localhost:3000/ichi-data-goes-here'
    }
  })

  // calling with log level
  logger.ichi({
    info: 'when pushing a webhook the first argument must be an object',
    moreInfo: 'it can contain any additional parameters you would like to post',
    andMoreInfo: 'the current log level and message will also be posted as *level* & *message*'
  }, 'log messages here', 'and another', ['arrays', 'and', 'objects', 'are', 'also', 'ok'])

  // more code here...
  logger.log('information logged here')
  // and so on...
})
```

## Authors

* **Matt Shostak** - *Initial work* - [Github](https://github.com/shatmostak)
* **Will Shostak** - *Initial work* - [Github](https://github.com/wshostak)

See also the list of [contributors](https://github.com/shatmostak/kantan-logger/contributors) who participated in this project.

## License

This project is licensed under the ISC License.
