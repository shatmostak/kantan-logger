// eslint-disable-next-line import/no-extraneous-dependencies
const mocha = require('mocha')
// eslint-disable-next-line import/no-extraneous-dependencies
const JUnit = require('mocha-junit-reporter')

const { Spec } = mocha.reporters
const { Base } = mocha.reporters
function JunitSpecReporter(runner, options) {
  Base.call(this, runner, options)
  // eslint-disable-next-line no-underscore-dangle
  this._junitReporter = new JUnit(runner, options)
  // eslint-disable-next-line no-underscore-dangle
  this._specReporter = new Spec(runner, options)
  return this
}
// eslint-disable-next-line no-proto
JunitSpecReporter.prototype.__proto__ = Base.prototype
module.exports = JunitSpecReporter
