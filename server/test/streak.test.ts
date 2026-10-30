import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateStreak, getStudyDate } from '../src/services/streakService.js'

test('streak starts at one on the first study date', () => {
  assert.deepEqual(calculateStreak(null, 0, 0, '2026-10-29'), {
    current_streak: 1,
    longest_streak: 1,
    last_study_date: '2026-10-29',
  })
})

test('same local calendar date does not increment a streak', () => {
  assert.deepEqual(calculateStreak('2026-10-29', 4, 7, '2026-10-29'), {
    current_streak: 4,
    longest_streak: 7,
    last_study_date: '2026-10-29',
  })
})

test('the next calendar date increments the streak', () => {
  assert.deepEqual(calculateStreak('2026-10-29', 4, 4, '2026-10-30'), {
    current_streak: 5,
    longest_streak: 5,
    last_study_date: '2026-10-30',
  })
})

test('a gap of more than one calendar date resets the current streak', () => {
  assert.deepEqual(calculateStreak('2026-10-27', 4, 8, '2026-10-29'), {
    current_streak: 1,
    longest_streak: 8,
    last_study_date: '2026-10-29',
  })
})

test('study date follows the supplied timezone across a UTC date boundary', () => {
  assert.equal(
    getStudyDate(new Date('2026-01-01T02:00:00.000Z'), 'America/Los_Angeles'),
    '2025-12-31',
  )
})

test('calendar-day differences do not depend on daylight-saving elapsed hours', () => {
  assert.deepEqual(calculateStreak('2026-03-08', 4, 4, '2026-03-09'), {
    current_streak: 5,
    longest_streak: 5,
    last_study_date: '2026-03-09',
  })
})
