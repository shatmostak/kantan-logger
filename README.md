# Kantan Logger

A simple but hopefully versitale logger.
Kantan Logger creates a log directory. In that directory Kantan Logger creates a directory with the date *(MM.DD.YY)*. logs are then titled with a time stamp *(HH.MM.SS.MMM)* of when it was created. 

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

To start a new instance of the logger or a new file to write to.
```
kantan.create(obj1)
```
__obj1__ - Object with the optional properties; *title*, *location* and *directory*.

### Options

Option | Default | Notes
--- | --- | ---
title | '' | *Appends the title to the log file name.*
location | '' | *Relative from the directory where your main file was run from*
directory | 'logs' | *Name of the logs directory*
Example:
```
kantan.create({
    title: 'TK-3623',
    location: 'var/',
    directory: 'my_logs'
})
```
### Use Case
For example:  You have an app that is always listening for a post, and on each post we create a new log file.

```
// server related requires and setup
const express = require('express')
const port = process.env.PORT || 3001
const app = express()
const kantan = require('kantan-logger')

// start listening on port
app.listen(port, () => {
  console.log('port up on ' + port)
})

// starts listening for POSTs
app.post('/',function(req, res) {
  res.writeHead(200, {"Content-Type": "text/html"})
  res.end('Thanks')
  // call new instance of kantan for this post
  let logger = kantan.create({
    // tells the logger to create logfile beginning with req.body.ticketId
    title: req.body.ticketId
  })

  // more code here...
  logger.log('information logged here')
  // and so on...
})
```

## Authors

* **Matt Shostak** - *Initial work* - [Github](https://github.com/PurpleBooth)
* **Will Shostak** - *Initial work* - [Github](https://github.com/PurpleBooth)

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

This project is licensed under the ISC License.