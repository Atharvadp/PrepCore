import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createStudySessionPayload,
  MAX_SESSION_DURATION,
  MIN_SESSION_DURATION,
  parseCustomSessionDuration,
  SESSION_DURATION_PRESETS,
} from '../src/utils/sessionDuration.ts'

test('focus session presets are 15, 30, 45, and 60 minutes', () => {
  assert.deepEqual(SESSION_DURATION_PRESETS, [15, 30, 45, 60])
})

test('custom durations accept integers within the backend range', () => {
  assert.equal(parseCustomSessionDuration('1'), MIN_SESSION_DURATION)
  assert.equal(parseCustomSessionDuration('90'), 90)
  assert.equal(parseCustomSessionDuration('1440'), MAX_SESSION_DURATION)
})

test('custom durations reject empty, fractional, nonnumeric, and out-of-range values', () => {
  for (const value of ['', '0', '-1', '1.5', '1441', '1e2', 'minutes']) {
    assert.equal(parseCustomSessionDuration(value), undefined, `expected ${value} to be invalid`)
  }
})

test('selected custom duration is passed to the study-session creation payload', () => {
  const duration = parseCustomSessionDuration('90')
  assert.notEqual(duration, undefined)
  assert.deepEqual(
    createStudySessionPayload(duration, 'task-id', 'America/Los_Angeles'),
    {
      duration_minutes: 90,
      task_id: 'task-id',
      timezone: 'America/Los_Angeles',
    },
  )
})

test('session payload keeps timezone optional when it is unavailable', () => {
  assert.deepEqual(createStudySessionPayload(15, null), {
    duration_minutes: 15,
    task_id: null,
  })
})
