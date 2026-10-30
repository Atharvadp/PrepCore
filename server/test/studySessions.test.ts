import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { app } from '../src/app.js'
import { connectToDatabase } from '../src/config/database.js'
import { config } from '../src/config/env.js'
import { ProfileModel } from '../src/models/profile.model.js'
import { StudySessionModel } from '../src/models/studySession.model.js'
import { TaskModel } from '../src/models/task.model.js'
import { UserModel } from '../src/models/user.model.js'
import { getStudyDate } from '../src/services/streakService.js'

const firstEmail = `session-test-${randomUUID()}@example.test`
const secondEmail = `session-test-${randomUUID()}@example.test`
let firstUserId: string
let secondUserId: string
let firstTaskId: string
let secondTaskId: string
let firstCookie: string
let secondCookie: string
let baseUrl: string
let server: ReturnType<typeof app.listen> | undefined

function createCookie(userId: string): string {
  const token = jwt.sign({ ver: 0 }, config.authTokenSecret, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: config.authTokenTtlSeconds,
  })
  return `prepcore_token=${token}`
}

async function request(
  path: string,
  cookie?: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(cookie ? { cookie } : {}),
      ...init?.headers,
    },
  })
}

before(async () => {
  await connectToDatabase()
  await Promise.all([UserModel.init(), TaskModel.init(), StudySessionModel.init(), ProfileModel.init()])
  const [firstUser, secondUser] = await Promise.all([
    UserModel.create({ email: firstEmail, passwordHash: 'test-hash', username: 'First tester' }),
    UserModel.create({ email: secondEmail, passwordHash: 'test-hash' }),
  ])
  firstUserId = firstUser._id
  secondUserId = secondUser._id
  firstCookie = createCookie(firstUserId)
  secondCookie = createCookie(secondUserId)

  const [firstTask, secondTask] = await Promise.all([
    TaskModel.create({
      user_id: firstUserId,
      title: 'First task',
      description: '',
      subject: 'Test',
    }),
    TaskModel.create({
      user_id: secondUserId,
      title: 'Second task',
      description: '',
      subject: 'Test',
    }),
  ])
  firstTaskId = firstTask._id
  secondTaskId = secondTask._id

  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  if (firstUserId && secondUserId) {
    await ProfileModel.deleteMany({ _id: { $in: [firstUserId, secondUserId] } })
    await StudySessionModel.deleteMany({ user_id: { $in: [firstUserId, secondUserId] } })
    await TaskModel.deleteMany({ _id: { $in: [firstTaskId, secondTaskId] } })
    await UserModel.deleteMany({ _id: { $in: [firstUserId, secondUserId] } })
  }
  if (server) {
    const closed = once(server, 'close')
    server.close()
    await closed
  }
  await mongoose.disconnect()
})

test('study-session API validates, scopes ownership, completes once, lists completed, and cancels', async () => {
  assert.equal((await request('/api/profile')).status, 401)
  assert.equal((await request('/api/study-sessions')).status, 401)
  assert.equal(
    (await request('/api/study-sessions', undefined, {
      method: 'POST',
      body: JSON.stringify({ duration_minutes: 25 }),
    })).status,
    401,
  )

  const profileReads = await Promise.all([
    request('/api/profile', firstCookie),
    request('/api/profile', firstCookie),
  ])
  assert.deepEqual(profileReads.map(({ status }) => status), [200, 200])
  const initialProfile = (await profileReads[0].json() as {
    profile: {
      id: string
      username: string
      current_streak: number
      longest_streak: number
      last_study_date: string | null
    }
  }).profile
  assert.equal(initialProfile.id, firstUserId)
  assert.equal(initialProfile.username, 'First tester')
  assert.equal(initialProfile.current_streak, 0)
  assert.equal(initialProfile.longest_streak, 0)
  assert.equal(initialProfile.last_study_date, null)
  assert.equal(await ProfileModel.countDocuments({ _id: firstUserId }), 1)
  await ProfileModel.updateOne({ _id: firstUserId }, { $set: { username: 'Legacy profile name' } })
  const canonicalUsernameResponse = await request('/api/profile', firstCookie)
  assert.equal((await canonicalUsernameResponse.json() as { profile: { username: string } }).profile.username, 'First tester')
  assert.equal((await ProfileModel.findById(firstUserId))?.username, 'Legacy profile name')
  const usernameOptionalProfileResponse = await request('/api/profile', secondCookie)
  assert.equal(usernameOptionalProfileResponse.status, 200)
  assert.equal((await ProfileModel.findById(secondUserId))?.username, undefined)

  for (const duration of [0, -1, 1.5, 1441, '25']) {
    const invalid = await request('/api/study-sessions', firstCookie, {
      method: 'POST',
      body: JSON.stringify({ duration_minutes: duration }),
    })
    assert.equal(invalid.status, 400)
  }

  const invalidTaskId = await request('/api/study-sessions', firstCookie, {
    method: 'POST',
    body: JSON.stringify({ duration_minutes: 25, task_id: 'not-a-uuid' }),
  })
  assert.equal(invalidTaskId.status, 400)
  const invalidTimezone = await request('/api/study-sessions', firstCookie, {
    method: 'POST',
    body: JSON.stringify({ duration_minutes: 25, timezone: 'Not/A_Timezone' }),
  })
  assert.equal(invalidTimezone.status, 400)

  const foreignTask = await request('/api/study-sessions', firstCookie, {
    method: 'POST',
    body: JSON.stringify({ duration_minutes: 25, task_id: secondTaskId }),
  })
  assert.equal(foreignTask.status, 400)

  const forgedOwner = await request('/api/study-sessions', firstCookie, {
    method: 'POST',
    body: JSON.stringify({ duration_minutes: 25, user_id: secondUserId }),
  })
  assert.equal(forgedOwner.status, 400)

  const createdResponse = await request('/api/study-sessions', firstCookie, {
    method: 'POST',
    body: JSON.stringify({
      duration_minutes: 25,
      task_id: firstTaskId,
      timezone: 'America/Los_Angeles',
    }),
  })
  assert.equal(createdResponse.status, 201)
  const createdBody = (await createdResponse.json()) as {
    session: {
      id: string
      user_id: string
      task_id: string
      duration_minutes: number
      started_at: string
      ended_at: string | null
      completed: boolean
      timezone: string
    }
  }
  const session = createdBody.session
  assert.match(session.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  assert.equal(session.user_id, firstUserId)
  assert.equal(session.task_id, firstTaskId)
  assert.equal(session.duration_minutes, 25)
  assert.equal(Number.isNaN(Date.parse(session.started_at)), false)
  assert.equal(session.ended_at, null)
  assert.equal(session.completed, false)
  assert.equal(session.timezone, 'America/Los_Angeles')

  const noTaskResponse = await request('/api/study-sessions', secondCookie, {
    method: 'POST',
    body: JSON.stringify({ duration_minutes: 15, task_id: null }),
  })
  assert.equal(noTaskResponse.status, 201)
  const noTaskBody = (await noTaskResponse.json()) as {
    session: { id: string; user_id: string; task_id: string | null; timezone: string }
  }
  assert.equal(noTaskBody.session.user_id, secondUserId)
  assert.equal(noTaskBody.session.task_id, null)
  assert.equal(noTaskBody.session.timezone, 'UTC')

  const usernameOptionalSessionResponse = await request('/api/study-sessions', secondCookie, {
    method: 'POST',
    body: JSON.stringify({ duration_minutes: 15 }),
  })
  assert.equal(usernameOptionalSessionResponse.status, 201)
  const usernameOptionalSessionBody = await usernameOptionalSessionResponse.json() as {
    session: { id: string }
  }
  const usernameOptionalCompletion = await request(
    `/api/study-sessions/${usernameOptionalSessionBody.session.id}/complete`,
    secondCookie,
    { method: 'PATCH' },
  )
  assert.equal(usernameOptionalCompletion.status, 200)
  assert.equal((await ProfileModel.findById(secondUserId))?.current_streak, 1)

  const foreignComplete = await request(
    `/api/study-sessions/${noTaskBody.session.id}/complete`,
    firstCookie,
    { method: 'PATCH' },
  )
  assert.equal(foreignComplete.status, 404)
  assert.deepEqual(await foreignComplete.json(), { error: 'Study session not found' })

  const foreignDelete = await request(
    `/api/study-sessions/${noTaskBody.session.id}`,
    firstCookie,
    { method: 'DELETE' },
  )
  assert.equal(foreignDelete.status, 404)
  assert.deepEqual(await foreignDelete.json(), { error: 'Study session not found' })

  const firstUserListBefore = await request('/api/study-sessions', firstCookie)
  assert.equal(firstUserListBefore.status, 200)
  assert.deepEqual((await firstUserListBefore.json() as { sessions: unknown[] }).sessions, [])

  const completedResponse = await request(
    `/api/study-sessions/${session.id}/complete`,
    firstCookie,
    { method: 'PATCH' },
  )
  assert.equal(completedResponse.status, 200)
  const completedBody = (await completedResponse.json()) as {
    session: { user_id: string; completed: boolean; ended_at: string | null; timezone: string }
  }
  assert.equal(completedBody.session.user_id, firstUserId)
  assert.equal(completedBody.session.completed, true)
  assert.equal(typeof completedBody.session.ended_at, 'string')
  assert.equal(Number.isNaN(Date.parse(completedBody.session.ended_at as string)), false)
  assert.equal(completedBody.session.timezone, 'America/Los_Angeles')

  const repeatedCompletions = await Promise.all([
    request(`/api/study-sessions/${session.id}/complete`, firstCookie, { method: 'PATCH' }),
    request(`/api/study-sessions/${session.id}/complete`, firstCookie, { method: 'PATCH' }),
  ])
  assert.deepEqual(repeatedCompletions.map(({ status }) => status), [200, 200])
  const profileAfterRepeatedCompletion = await ProfileModel.findById(firstUserId)
  assert.equal(profileAfterRepeatedCompletion?.current_streak, 1)
  assert.equal(profileAfterRepeatedCompletion?.longest_streak, 1)

  const today = getStudyDate(new Date(Date.now() + 60_000), 'America/Los_Angeles')
  const dateWithOffset = (date: string, offset: number): string => {
    const [year, month, day] = date.split('-').map(Number)
    const shifted = new Date(Date.UTC(year, month - 1, day + offset))
    return shifted.toISOString().slice(0, 10)
  }
  const streakSessionIds: string[] = []
  const completeSession = async (): Promise<void> => {
    const created = await request('/api/study-sessions', firstCookie, {
      method: 'POST',
      body: JSON.stringify({ duration_minutes: 10, timezone: 'America/Los_Angeles' }),
    })
    assert.equal(created.status, 201)
    const body = await created.json() as { session: { id: string } }
    streakSessionIds.push(body.session.id)
    const completed = await request(
      `/api/study-sessions/${body.session.id}/complete`,
      firstCookie,
      { method: 'PATCH' },
    )
    assert.equal(completed.status, 200)
  }

  await completeSession()
  assert.equal((await ProfileModel.findById(firstUserId))?.current_streak, 1)

  await ProfileModel.updateOne(
    { _id: firstUserId },
    { $set: { current_streak: 2, longest_streak: 5, last_study_date: dateWithOffset(today, -1) } },
  )
  await completeSession()
  const consecutiveProfile = await ProfileModel.findById(firstUserId)
  assert.equal(consecutiveProfile?.current_streak, 3)
  assert.equal(consecutiveProfile?.longest_streak, 5)

  await ProfileModel.updateOne(
    { _id: firstUserId },
    { $set: { current_streak: 6, longest_streak: 8, last_study_date: dateWithOffset(today, -2) } },
  )
  await completeSession()
  const missedDayProfile = await ProfileModel.findById(firstUserId)
  assert.equal(missedDayProfile?.current_streak, 1)
  assert.equal(missedDayProfile?.longest_streak, 8)

  const firstUserList = await request('/api/study-sessions', firstCookie)
  assert.equal(firstUserList.status, 200)
  const firstUserListBody = (await firstUserList.json()) as {
    sessions: Array<{ id: string; user_id: string; duration_minutes: number; started_at: string; completed: boolean }>
  }
  assert.deepEqual(
    firstUserListBody.sessions.map(({ id }) => id).sort(),
    [session.id, ...streakSessionIds].sort(),
  )
  const listedSession = firstUserListBody.sessions.find(({ id }) => id === session.id)
  assert.equal(listedSession?.user_id, firstUserId)
  assert.equal(listedSession?.duration_minutes, 25)
  assert.equal(listedSession?.completed, true)
  assert.equal(Number.isNaN(Date.parse(listedSession?.started_at ?? '')), false)

  const secondUserList = await request('/api/study-sessions', secondCookie)
  assert.equal(secondUserList.status, 200)
  const secondUserListBody = await secondUserList.json() as {
    sessions: Array<{ id: string; user_id: string; completed: boolean }>
  }
  assert.deepEqual(secondUserListBody.sessions.map(({ id }) => id), [
    usernameOptionalSessionBody.session.id,
  ])
  assert.equal(secondUserListBody.sessions[0].user_id, secondUserId)
  assert.equal(secondUserListBody.sessions[0].completed, true)

  const cancelResponse = await request(
    `/api/study-sessions/${noTaskBody.session.id}`,
    secondCookie,
    { method: 'DELETE' },
  )
  assert.equal(cancelResponse.status, 200)
  assert.deepEqual(await cancelResponse.json(), { message: 'Study session deleted' })

  const completeAfterCancel = await request(
    `/api/study-sessions/${noTaskBody.session.id}/complete`,
    secondCookie,
    { method: 'PATCH' },
  )
  assert.equal(completeAfterCancel.status, 404)
})
