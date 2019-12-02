# Kantan Logger

A simple but hopefully versital logger.
Kantan Logger creats a log directory. In that directory Kantan Logger creates a directory with the date *(MM.DD.YY)*. logs are then titled with a time stamp *(HH.MM.SS.MMM)* of when it was created. 

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
Example with options:
```
kantan.create({
    title: 'TK-3623',
    location: 'var/',
    directory: 'my_logs'
})
```

### Options

Option | Default | Notes
--- | --- | ---
title | '' | *Appends the title to the log file name.*
location | '' | *Relative from the directory where your main file was run from*
directory | 'logs' | *Name of the logs directory*
```
Give an example
```

## Authors

* **Matt Shostak** - *Initial work* - [Github](https://github.com/PurpleBooth)
* **Will Shostak** - *Initial work* - [Github](https://github.com/PurpleBooth)

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

This project is licensed under the ISC License.