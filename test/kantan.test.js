const fs = require('fs')
const path = require('path')
const logger = require('../index')

describe('Kantan Logger', () => {
  beforeEach(() => {
    // Spy on fs.appendFileSync so we can intercept log writes
    jest.spyOn(fs, 'appendFileSync').mockImplementation(() => {})
    // Reset logger options between tests
    logger.echoToConsole = false
    logger.useJSON = false
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('writes plain text log when useJSON is false', () => {
    // Call the default log function.
    logger.log('test plain text message')
    expect(fs.appendFileSync).toHaveBeenCalledTimes(1)

    const [filePath, payload] = fs.appendFileSync.mock.calls[0]
    // Ensure the file extension is .log
    expect(path.extname(filePath)).toBe('.log')
    expect(payload).toContain('test plain text message')
  })

  test('writes json log when useJSON is true', async () => {
    // Set useJSON flag to true
    logger.useJSON = true

    // Use one of the log levels – for example, "info" is dynamically created.
    await logger.info({ test: 'json message' })

    expect(fs.appendFileSync).toHaveBeenCalledTimes(1)

    const [filePath, payload] = fs.appendFileSync.mock.calls[0]
    // Ensure the file extension is .jsonl
    expect(path.extname(filePath)).toBe('.jsonl')
    // The payload should be a valid JSON string ending with a newline.
    expect(payload.endsWith('\n')).toBe(true)
    expect(() => JSON.parse(payload)).not.toThrow()

    const parsed = JSON.parse(payload)
    // Check the object inside the messages array
    expect(parsed.messages[0].test).toBe('json message')
  })

  test('handles multiple log levels and queues items', async () => {
    // Test using a different log level, e.g. "success"
    logger.useJSON = true
    await logger.success({ status: 'ok' }, 'final message')
    expect(fs.appendFileSync).toHaveBeenCalledTimes(1)
    const [filePath, payload] = fs.appendFileSync.mock.calls[0]
    expect(path.extname(filePath)).toBe('.jsonl')
    const parsed = JSON.parse(payload)
    expect(parsed.level).toBe('success')
    expect(parsed.messages).toContainEqual({ status: 'ok' })
    expect(parsed.messages).toContain('final message')
  })
})
