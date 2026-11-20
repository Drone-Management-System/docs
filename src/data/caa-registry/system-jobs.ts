import {bearerErrors, idParam, paging, PAGING_ERRORS} from '@site/src/api/helpers';
import type {EndpointSpec, JsonValue} from '@site/src/api/types';

import {IDS} from './samples';

const api = 'caa-registry' as const;
const group = 'System jobs';

const job: {[key: string]: JsonValue} = {
  id: IDS.job,
  type: 'zitadel_user_reconciliation',
  status: 'completed',
  createdBySubject: '312244512312345678',
  createdByName: 'amina@skyline.example',
  payload: {
    source: 'manual', mode: 'events', dryRun: false, commitCursor: true, queuedAt: '2026-06-03T12:00:00.000Z',
    counts: {events: 3, processed: 3, created: 1, updated: 1, unchanged: 0, deleted: 1, missing: 0, skipped: 0, failed: 0},
    failures: [], cursorAfter: {lastCreationDate: '2026-06-03T11:58:41.112Z'}, completedAt: '2026-06-03T12:00:04.210Z',
  },
  resultSummary: 'Synced 3 Zitadel users from events: 1 created, 1 updated, 1 deleted, 0 missing, 0 unchanged, 0 skipped, 0 failed.',
  errorMessage: null,
  startedAt: '2026-06-03T12:00:02.004Z',
  completedAt: '2026-06-03T12:00:04.210Z',
  failedAt: null,
  createdAt: '2026-06-03T12:00:00.000Z',
  updatedAt: '2026-06-03T12:00:04.210Z',
};

const jobIdParam = idParam('jobId', 'System job id.', IDS.job);

export const systemJobs = {
  list: {
    id: 'list-system-jobs', api, group, method: 'GET', path: '/system/jobs',
    title: 'List system jobs', permission: 'users.read',
    description: 'Newest first. Job objects use camelCase keys. `status` wins over `active` when both are sent.',
    queryParams: [
      {name: 'type', type: 'enum', description: 'Only `zitadel_user_reconciliation` exists today.'},
      {name: 'status', type: 'string', description: 'Comma-separated: `queued`, `running`, `completed`, `failed`.', example: 'completed,failed'},
      {name: 'active', type: 'boolean', description: '`true` for queued and running, `false` for completed and failed.'},
      {name: 'created_by_subject', type: 'string', description: 'Token subject that queued the job.'},
      ...paging(),
    ],
    responses: [{status: 200, body: {items: [job], limit: 20, offset: 0, has_more: false, filters: {type: null, status: ['completed', 'failed'], active: null, created_by_subject: null}}}],
    errors: [
      ...PAGING_ERRORS,
      {status: 400, detail: 'system_job_type_invalid', when: 'Unknown `type`.'},
      {status: 400, detail: 'system_job_status_invalid', when: 'Unknown value in `status`.'},
      {status: 400, detail: 'boolean_query_invalid', when: '`active` is not `true` or `false`.'},
      ...bearerErrors('users.read'),
    ],
  },
  queueSync: {
    id: 'queue-zitadel-user-sync', api, group, method: 'POST', path: '/system/jobs/zitadel-user-sync',
    title: 'Queue a ZITADEL user sync', permission: 'users.write',
    description: 'Queues a reconciliation job. The in-process worker picks it up when `SYSTEM_JOB_IN_PROCESS_WORKER_ENABLED` is on; otherwise run it with `POST /system/jobs/:jobId/run` or the job script.',
    bodyFields: [
      {name: 'mode', type: 'enum', description: '`events` reads ZITADEL user lifecycle events after the stored cursor. `full_scan` lists every human user.', default: 'events'},
      {name: 'dryRun', type: 'boolean', description: 'Count changes without writing users or the cursor.', default: 'false'},
      {name: 'limit', type: 'integer', description: 'Events or users to process, 1 to 5000. Defaults to the configured page size or max users.'},
      {name: 'fromSequence', type: 'integer', description: 'Start after this event sequence instead of the stored cursor.'},
      {name: 'fromDate', type: 'datetime', description: 'Start at this event creation date instead of the stored cursor.'},
      {name: 'commitCursor', type: 'boolean', description: 'Save the new cursor after a successful `events` run.', default: 'true'},
    ],
    body: {mode: 'events', dryRun: false, limit: 500, commitCursor: true},
    responses: [{status: 202, body: {success: true, job: {id: IDS.job, type: 'zitadel_user_reconciliation', status: 'queued', createdAt: '2026-06-03T12:00:00.000Z'}}}],
    errors: [{status: 400, detail: 'system_job_payload_invalid', when: 'The body does not match the schema.'}, ...bearerErrors('users.write')],
  },
  run: {
    id: 'run-system-job', api, group, method: 'POST', path: '/system/jobs/:jobId/run',
    title: 'Run a queued job now', permission: 'users.write',
    description: 'Claims the job and runs it inside this request, then returns the final job. Stale running jobs are recovered first.',
    pathParams: [jobIdParam],
    responses: [
      {status: 200, description: 'The job ran in this request.', body: {success: true, executed: true, job}},
      {status: 202, description: 'Not executed: the job is already running, or is queued but cannot be claimed yet (`system_job_waiting_for_type`).', body: {success: true, executed: false, reason: 'system_job_already_running', job: {...job, status: 'running', completedAt: null}}},
      {status: 200, description: 'Not executed: the job already finished (`system_job_already_completed` or `system_job_already_failed`).', body: {success: true, executed: false, reason: 'system_job_already_completed', job}},
    ],
    errors: [{status: 400, detail: 'system_job_id_invalid', when: 'Not a UUID.'}, {status: 404, detail: 'system_job_not_found', when: 'No job has this id.'}, ...bearerErrors('users.write')],
  },
  status: {
    id: 'zitadel-user-sync-status', api, group, method: 'GET', path: '/system/jobs/zitadel-user-sync/status',
    title: 'Get ZITADEL sync status', permission: 'users.read',
    description: 'Cursor, raw state, job counts by status, and the latest active, completed, and failed jobs.',
    responses: [{status: 200, body: {
      success: true,
      sync: {
        type: 'zitadel_user_reconciliation',
        cursor: {lastCreationDate: '2026-06-03T11:58:41.112Z', updatedAt: '2026-06-03T12:00:04.200Z'},
        state: {lastCreationDate: '2026-06-03T11:58:41.112Z', updatedAt: '2026-06-03T12:00:04.200Z'},
        counts: {queued: 0, running: 0, completed: 12, failed: 1},
        active: false,
        latestActiveJob: null,
        latestCompletedJob: job,
        latestFailedJob: null,
      },
    }}],
    errors: bearerErrors('users.read'),
  },
  get: {
    id: 'get-system-job', api, group, method: 'GET', path: '/system/jobs/:jobId',
    title: 'Get a system job', permission: 'users.read', pathParams: [jobIdParam],
    responses: [{status: 200, body: {success: true, job}}],
    errors: [{status: 400, detail: 'system_job_id_invalid', when: 'Not a UUID.'}, {status: 404, detail: 'system_job_not_found', when: 'No job has this id.'}, ...bearerErrors('users.read')],
  },
} satisfies Record<string, EndpointSpec>;
