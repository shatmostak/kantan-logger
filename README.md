# Kantan Logger

A simple but hopefully versatile logger.  
Kantan Logger creates a log directory. In that directory Kantan Logger creates a directory with the date *(MM.DD.YY)*. Log files are then titled with a time stamp *(HH.MM.SS.MMM)* from when they were created.

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
```js
// node/common.js style 
const kantan = require('kantan-logger')
```

## Usage

```
kantan.log(obj1 [, obj2, ..., objN])
```

__obj1 ... objN__ - A list of JavaScript objects to write to the log file. The string representations of these objects are appended together in the order listed and written.

To start a new instance of the logger or a new file to write:
```
kantan.create(obj1)
```
__obj1__ - Object with the optional properties; *title*, *location* and *directory*.

### Options

Option | Default | Notes
--- | --- | ---
title | '' | *Prepends the title to the log file name*
location | '' | *Relative to the directory from which your main file is run*
directory | 'logs' | *Name of the logs directory*
logLevels | ['success', 'verbose', 'info', 'warning', 'error'] | *Names of the log levels you require*
logLevelWebhooks | {} | *Object where the property is the log level to trigger a webhook, and the value is the URL to post to*
useTimeInTitle | true | *Include a time stamp in the log file name*
useDateDirectories | true | *Separate log files into date‑based subdirectories*
daysTillDelete | 7 | *Number of days of logs to keep before deletion*
prettyJSON | true | *Prettify JSON output in log entries*
prettyText | true | *Formats text output without extra string literal quotes*
echoToConsole | false | *Echoes logs to the console*
useJSON | false | *When true, writes each log entry as a full JSON object in a newline‑delimited JSON file (extension: .jsonl)*
showMemoryUsage | false | *Includes memory usage statistics in the log entry*

### JSON Output

When the `useJSON` option is set to `true`, each log entry is output using `JSON.stringify` (with formatting if enabled by `prettyJSON`). The log file is created with a `.jsonl` extension and consists of individual, newline‑separated JSON objects. This format is suitable for processing with tools that support JSON lines.

### Use Case

For example: You have an application that continuously listens for POST requests. For each post, a new log instance is created:

```js
// server related requires and setup
const express = require('express')
const kantan = require('kantan-logger')

const port = process.env.PORT || 3001
const app = express()

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

// Start listening on port
app.listen(port, () => {
  console.log(`port up on ${port}`)
})

// Listen for POST requests
app.post('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end('Thanks')

  // Create a new instance of kantan for this post.
  // The title is prefixed with the req.body.ticketId.
  const logger = kantan.create({
    title: req.body.ticketId,
    logLevels: ['ichi', 'ni', 'san', 'shi', 'go'],
    logLevelWebhooks: {
      ichi: 'http://localhost:3000/ichi-data-goes-here'
    }
  })

  // Calling with a log level.
  logger.ichi({
    info: 'when pushing a webhook the first argument must be an object',
    moreInfo: 'it can contain any additional parameters you would like to post',
    andMoreInfo: 'the current log level and message will also be posted as *level* & *message*'
  }, 'log messages here', 'and another', ['arrays', 'and', 'objects', 'are', 'also', 'ok'])

  // Additional log output.
  logger.log('information logged here')
})
```

## Authors

* **Matt Shostak** - *Initial work* - [Github](https://github.com/shatmostak)
* **Will Shostak** - *Initial work* - [Github](https://github.com/wshostak)

See also the list of [contributors](https://github.com/shatmostak/kantan-logger/contributors) who participated in this project.

## License

This project is licensed under the ISC License.