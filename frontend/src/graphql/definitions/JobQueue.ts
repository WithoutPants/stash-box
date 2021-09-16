/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { JobStatus } from "./globalTypes";

// ====================================================
// GraphQL query operation: JobQueue
// ====================================================

export interface JobQueue_jobQueue {
  __typename: "Job";
  id: string;
  status: JobStatus;
  subTasks: string[] | null;
  description: string;
  progress: number | null;
  startTime: any | null;
  endTime: any | null;
  addTime: any;
}

export interface JobQueue {
  jobQueue: JobQueue_jobQueue[] | null;
}
