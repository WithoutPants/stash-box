/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { JobStatusUpdateType, JobStatus } from "./globalTypes";

// ====================================================
// GraphQL subscription operation: JobsSubscribe
// ====================================================

export interface JobsSubscribe_jobsSubscribe_job {
  __typename: "Job";
  id: string;
  status: JobStatus;
  subTasks: string[] | null;
  description: string;
  progress: number | null;
}

export interface JobsSubscribe_jobsSubscribe {
  __typename: "JobStatusUpdate";
  type: JobStatusUpdateType;
  job: JobsSubscribe_jobsSubscribe_job;
}

export interface JobsSubscribe {
  jobsSubscribe: JobsSubscribe_jobsSubscribe;
}
