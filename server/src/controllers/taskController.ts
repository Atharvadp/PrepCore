import type { Request, RequestHandler } from 'express'
import { HttpError } from '../middleware/httpError.js'
import { TaskModel, type Task } from '../models/task.model.js'
import {
  parseCreateTaskBody,
  parseTaskId,
  parseTaskListQuery,
  parseUpdateTaskBody,
} from '../validation/taskValidation.js'

function getAuthenticatedUserId(request: Request): string {
  if (!request.authUserId) {
    throw new HttpError(401, 'Authentication required')
  }
  return request.authUserId
}

function serializeTask(task: Task) {
  return {
    id: task._id,
    user_id: task.user_id,
    title: task.title,
    description: task.description,
    subject: task.subject,
    is_completed: task.is_completed,
    created_at: task.created_at.toISOString(),
  }
}

function validatedTaskId(value: unknown): string {
  const id = parseTaskId(value)
  if (!id) {
    throw new HttpError(400, 'Task ID must be a valid UUID')
  }
  return id
}

export const createTask: RequestHandler = async (request, response) => {
  const parsed = parseCreateTaskBody(request.body)
  if (!parsed.value) {
    throw new HttpError(400, 'Request validation failed', { errors: parsed.errors })
  }

  const task = await TaskModel.create({
    ...parsed.value,
    user_id: getAuthenticatedUserId(request),
  })
  response.status(201).json({ task: serializeTask(task) })
}

export const listTasks: RequestHandler = async (request, response) => {
  const parsedQuery = parseTaskListQuery(request.query)
  if (!parsedQuery.value) {
    throw new HttpError(400, 'Request validation failed', { errors: parsedQuery.errors })
  }

  const filter = {
    user_id: getAuthenticatedUserId(request),
    ...parsedQuery.value,
  }
  const tasks = await TaskModel.find(filter).sort({ created_at: -1 })
  response.status(200).json({ tasks: tasks.map(serializeTask) })
}

export const getTask: RequestHandler = async (request, response) => {
  const id = validatedTaskId(request.params.id)
  const task = await TaskModel.findOne({
    _id: id,
    user_id: getAuthenticatedUserId(request),
  })
  if (!task) {
    throw new HttpError(404, 'Task not found')
  }
  response.status(200).json({ task: serializeTask(task) })
}

export const updateTask: RequestHandler = async (request, response) => {
  const id = validatedTaskId(request.params.id)
  const parsed = parseUpdateTaskBody(request.body)
  if (!parsed.value) {
    throw new HttpError(400, 'Request validation failed', { errors: parsed.errors })
  }

  const task = await TaskModel.findOneAndUpdate(
    { _id: id, user_id: getAuthenticatedUserId(request) },
    { $set: parsed.value },
    { new: true, runValidators: true },
  )
  if (!task) {
    throw new HttpError(404, 'Task not found')
  }
  response.status(200).json({ task: serializeTask(task) })
}

export const deleteTask: RequestHandler = async (request, response) => {
  const id = validatedTaskId(request.params.id)
  const task = await TaskModel.findOneAndDelete({
    _id: id,
    user_id: getAuthenticatedUserId(request),
  })
  if (!task) {
    throw new HttpError(404, 'Task not found')
  }
  response.status(200).json({ message: 'Task deleted' })
}
