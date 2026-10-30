import type { Request } from 'express'
import { Router } from 'express'
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from '../controllers/taskController.js'
import { requireAuthentication } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  parseCreateTaskBody,
  parseTaskListQuery,
  parseTaskId,
  parseUpdateTaskBody,
} from '../validation/taskValidation.js'
export const taskRoutes = Router()

function validateTaskId(request: Request): string[] {
  return parseTaskId(request.params.id) ? [] : ['Task ID must be a valid UUID']
}

taskRoutes.use(requireAuthentication)
taskRoutes.post(
  '/',
  validateRequest((request) => parseCreateTaskBody(request.body).errors),
  createTask,
)
taskRoutes.get(
  '/',
  validateRequest((request) => parseTaskListQuery(request.query).errors),
  listTasks,
)
taskRoutes.get(
  '/:id',
  validateRequest(validateTaskId),
  getTask,
)
taskRoutes.patch(
  '/:id',
  validateRequest((request) => {
    const errors = parseUpdateTaskBody(request.body).errors
    return [...errors, ...validateTaskId(request)]
  }),
  updateTask,
)
taskRoutes.delete(
  '/:id',
  validateRequest(validateTaskId),
  deleteTask,
)
