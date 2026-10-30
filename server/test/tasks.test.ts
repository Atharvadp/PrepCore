import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { after, before, test } from 'node:test'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { app } from '../src/app.js'
import { config } from '../src/config/env.js'
import { connectToDatabase } from '../src/config/database.js'
import { UserModel } from '../src/models/user.model.js'
import { TaskModel } from '../src/models/task.model.js'

const firstEmail = `task-test-${randomUUID()}@example.test`
const secondEmail = `task-test-${randomUUID()}@example.test`
let firstUserId: string
let secondUserId: string
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
  await Promise.all([UserModel.init(), TaskModel.init()])
  const [firstUser, secondUser] = await Promise.all([
    UserModel.create({ email: firstEmail, passwordHash: 'test-hash' }),
    UserModel.create({ email: secondEmail, passwordHash: 'test-hash' }),
  ])
  firstUserId = firstUser._id
  secondUserId = secondUser._id
  firstCookie = createCookie(firstUserId)
  secondCookie = createCookie(secondUserId)

  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  if (firstUserId && secondUserId) {
    await TaskModel.deleteMany({ user_id: { $in: [firstUserId, secondUserId] } })
    await UserModel.deleteMany({ _id: { $in: [firstUserId, secondUserId] } })
  }
  if (server) {
    const closed = once(server, 'close')
    server.close()
    await closed
  }
  await mongoose.disconnect()
})

test('task API enforces ownership and supports create, list, update, and delete', async () => {
  const health = await request('/api/health')
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { status: 'ok', database: 'connected' })

  assert.equal((await request('/api/tasks')).status, 401)
  assert.equal(
    (await request('/api/tasks', undefined, {
      method: 'POST',
      body: JSON.stringify({ title: 'No auth', subject: 'Test' }),
    })).status,
    401,
  )

  const emptyTitle = await request('/api/tasks', firstCookie, {
    method: 'POST',
    body: JSON.stringify({ title: '   ', subject: 'Test' }),
  })
  assert.equal(emptyTitle.status, 400)

  const emptySubject = await request('/api/tasks', firstCookie, {
    method: 'POST',
    body: JSON.stringify({ title: 'Valid title', subject: '  ' }),
  })
  assert.equal(emptySubject.status, 400)

  const invalidDescription = await request('/api/tasks', firstCookie, {
    method: 'POST',
    body: JSON.stringify({ title: 'Valid title', subject: 'Test', description: 123 }),
  })
  assert.equal(invalidDescription.status, 400)

  const invalidCompletion = await request('/api/tasks', firstCookie, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Valid title',
      subject: 'Test',
      is_completed: true,
    }),
  })
  assert.equal(invalidCompletion.status, 400)

  const earlierTaskResponse = await request('/api/tasks', firstCookie, {
    method: 'POST',
    body: JSON.stringify({ title: 'Earlier task', subject: 'History' }),
  })
  assert.equal(earlierTaskResponse.status, 201)
  const earlierTaskBody = (await earlierTaskResponse.json()) as {
    task: { id: string; user_id: string }
  }

  const createdResponse = await request('/api/tasks', firstCookie, {
    method: 'POST',
    body: JSON.stringify({
      title: '  Read chapter  ',
      subject: '  Biology  ',
      user_id: secondUserId,
    }),
  })
  assert.equal(createdResponse.status, 201)
  const createdBody = (await createdResponse.json()) as {
    task: {
      id: string
      user_id: string
      title: string
      description: string
      subject: string
      is_completed: boolean
      created_at: string
    }
  }
  const task = createdBody.task
  assert.match(task.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  assert.equal(task.user_id, firstUserId)
  assert.equal(task.title, 'Read chapter')
  assert.equal(task.subject, 'Biology')
  assert.equal(task.description, '')
  assert.equal(task.is_completed, false)
  assert.equal(Number.isNaN(Date.parse(task.created_at)), false)
  assert.equal((await request(`/api/tasks/${task.id}`, firstCookie)).status, 200)

  const secondTaskResponse = await request('/api/tasks', secondCookie, {
    method: 'POST',
    body: JSON.stringify({ title: 'Second user task', subject: 'Math', description: '' }),
  })
  assert.equal(secondTaskResponse.status, 201)
  const secondTaskBody = (await secondTaskResponse.json()) as {
    task: { id: string; user_id: string }
  }
  assert.equal(secondTaskBody.task.user_id, secondUserId)

  const listResponse = await request('/api/tasks', firstCookie)
  assert.equal(listResponse.status, 200)
  const listBody = (await listResponse.json()) as { tasks: Array<{ id: string; user_id: string }> }
  assert.deepEqual(listBody.tasks.map((item) => item.id), [
    task.id,
    earlierTaskBody.task.id,
  ])
  assert.equal(listBody.tasks.every((item) => item.user_id === firstUserId), true)

  const completedList = await request('/api/tasks?is_completed=true', firstCookie)
  assert.equal(completedList.status, 200)
  assert.deepEqual((await completedList.json() as { tasks: unknown[] }).tasks, [])
  assert.equal((await request('/api/tasks?is_completed=invalid', firstCookie)).status, 400)

  const invalidId = await request('/api/tasks/not-a-uuid', firstCookie)
  assert.equal(invalidId.status, 400)

  const otherRead = await request(`/api/tasks/${secondTaskBody.task.id}`, firstCookie)
  assert.equal(otherRead.status, 404)
  assert.deepEqual(await otherRead.json(), { error: 'Task not found' })

  const otherUpdate = await request(`/api/tasks/${secondTaskBody.task.id}`, firstCookie, {
    method: 'PATCH',
    body: JSON.stringify({ is_completed: true }),
  })
  assert.equal(otherUpdate.status, 404)
  assert.deepEqual(await otherUpdate.json(), { error: 'Task not found' })

  const forgedOwnerUpdate = await request(`/api/tasks/${task.id}`, firstCookie, {
    method: 'PATCH',
    body: JSON.stringify({ is_completed: true, user_id: secondUserId }),
  })
  assert.equal(forgedOwnerUpdate.status, 400)

  const updatedResponse = await request(`/api/tasks/${task.id}`, firstCookie, {
    method: 'PATCH',
    body: JSON.stringify({ is_completed: true }),
  })
  assert.equal(updatedResponse.status, 200)
  const updatedBody = (await updatedResponse.json()) as {
    task: { id: string; user_id: string; is_completed: boolean }
  }
  assert.equal(updatedBody.task.id, task.id)
  assert.equal(updatedBody.task.user_id, firstUserId)
  assert.equal(updatedBody.task.is_completed, true)

  const completedTasks = await request('/api/tasks?is_completed=true', firstCookie)
  assert.equal(completedTasks.status, 200)
  assert.equal((await completedTasks.json() as { tasks: unknown[] }).tasks.length, 1)

  const otherDelete = await request(`/api/tasks/${secondTaskBody.task.id}`, firstCookie, {
    method: 'DELETE',
  })
  assert.equal(otherDelete.status, 404)
  assert.deepEqual(await otherDelete.json(), { error: 'Task not found' })
  assert.equal((await request(`/api/tasks/${secondTaskBody.task.id}`, secondCookie)).status, 200)

  const deletedResponse = await request(`/api/tasks/${task.id}`, firstCookie, {
    method: 'DELETE',
  })
  assert.equal(deletedResponse.status, 200)
  assert.deepEqual(await deletedResponse.json(), { message: 'Task deleted' })
  assert.equal((await request(`/api/tasks/${task.id}`, firstCookie)).status, 404)
})
