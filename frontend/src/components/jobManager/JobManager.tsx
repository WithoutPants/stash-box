import { IconName } from "@fortawesome/fontawesome-common-types";
import React, { useState, useEffect } from "react";
import { Button, Modal, ProgressBar } from "react-bootstrap";
import {
  JobStatus,
  JobStatusUpdateType,
  useJobQueue,
  useJobsSubscribe,
  useStopJob,
} from "src/graphql";
import { JobQueue_jobQueue } from "src/graphql/definitions/JobQueue";
import { Icon } from "../fragments";

type JobFragment = Pick<
  JobQueue_jobQueue,
  "id" | "status" | "subTasks" | "description" | "progress"
>;

interface IJob {
  job: JobFragment;
}

const Task: React.FC<IJob> = ({ job }) => {
  const [stopping, setStopping] = useState(false);
  const [className, setClassName] = useState("");
  const [mutateStopJob] = useStopJob();

  useEffect(() => {
    setTimeout(() => setClassName("fade-in"));
  }, []);

  useEffect(() => {
    if (
      job.status === JobStatus.CANCELLED ||
      job.status === JobStatus.FINISHED
    ) {
      // fade out around 10 seconds
      setTimeout(() => {
        setClassName("fade-out");
      }, 9800);
    }
  }, [job]);

  async function stopJob() {
    setStopping(true);
    await mutateStopJob({
      variables: {
        job_id: job.id,
      },
    });
  }

  function canStop() {
    return (
      !stopping &&
      (job.status === JobStatus.READY || job.status === JobStatus.RUNNING)
    );
  }

  function getStatusClass() {
    switch (job.status) {
      case JobStatus.READY:
        return "ready";
      case JobStatus.RUNNING:
        return "running";
      case JobStatus.STOPPING:
        return "stopping";
      case JobStatus.FINISHED:
        return "finished";
      case JobStatus.CANCELLED:
        return "cancelled";
    }
  }

  function getStatusIcon() {
    let icon: IconName = "circle";
    let iconClass = "";
    switch (job.status) {
      case JobStatus.READY:
        icon = "hourglass-start";
        break;
      case JobStatus.RUNNING:
        icon = "cog";
        iconClass = "fa-spin";
        break;
      case JobStatus.STOPPING:
        icon = "cog";
        iconClass = "fa-spin";
        break;
      case JobStatus.FINISHED:
        icon = "check";
        break;
      case JobStatus.CANCELLED:
        icon = "ban";
        break;
    }

    return <Icon icon={icon} className={`fa-fw ${iconClass}`} />;
  }

  function maybeRenderProgress() {
    if (
      job.status === JobStatus.RUNNING &&
      job.progress !== undefined &&
      job.progress !== null
    ) {
      const progress = job.progress * 100;
      return (
        <ProgressBar
          animated
          now={progress}
          label={`${progress.toFixed(0)}%`}
        />
      );
    }
  }

  function maybeRenderSubTasks() {
    if (job.status === JobStatus.RUNNING || job.status === JobStatus.STOPPING) {
      return (
        <div>
          {/* eslint-disable react/no-array-index-key */}
          {(job.subTasks ?? []).map((t, i) => (
            <div className="job-subtask" key={i}>
              {t}
            </div>
          ))}
          {/* eslint-enable react/no-array-index-key */}
        </div>
      );
    }
  }

  return (
    <li className={`job ${className}`}>
      <div>
        <Button
          className="minimal stop"
          size="sm"
          onClick={() => stopJob()}
          disabled={!canStop()}
        >
          <Icon icon="times" />
        </Button>
        <div className={`job-status ${getStatusClass()}`}>
          <div>
            {getStatusIcon()}
            <span>{job.description}</span>
          </div>
          <div>{maybeRenderProgress()}</div>
          {maybeRenderSubTasks()}
        </div>
      </div>
    </li>
  );
};

interface IJobTableProps {
  queue: JobFragment[];
}

const JobTable: React.FC<IJobTableProps> = ({ queue }) => (
  <div className="job-table">
    <ul>
      {(queue ?? []).map((j) => (
        <Task job={j} key={j.id} />
      ))}
    </ul>
  </div>
);

const JobManager: React.FC = () => {
  const jobStatus = useJobQueue();
  const jobsSubscribe = useJobsSubscribe();

  const [queue, setQueue] = useState<JobFragment[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setQueue(jobStatus.data?.jobQueue ?? []);
  }, [jobStatus]);

  useEffect(() => {
    if (!jobsSubscribe.data) {
      return;
    }

    const event = jobsSubscribe.data.jobsSubscribe;

    function updateJob() {
      setQueue((q) =>
        q.map((j) => {
          if (j.id === event.job.id) {
            return event.job;
          }

          return j;
        })
      );
    }

    switch (event.type) {
      case JobStatusUpdateType.ADD:
        // add to the end of the queue
        setQueue((q) => q.concat([event.job]));
        break;
      case JobStatusUpdateType.REMOVE:
        // update the job then remove after a timeout
        updateJob();
        setTimeout(() => {
          setQueue((q) => q.filter((j) => j.id !== event.job.id));
        }, 10000);
        break;
      case JobStatusUpdateType.UPDATE:
        updateJob();
        break;
    }
  }, [jobsSubscribe.data]);

  useEffect(() => {
    if (queue.length === 0) {
      setShow(false);
    }
  }, [queue]);

  const runningJobs = queue.filter(
    (j) => j.status !== JobStatus.CANCELLED && j.status !== JobStatus.FINISHED
  );

  const button = (
    <Button variant="secondary" size="sm" onClick={() => setShow(true)}>
      <Icon
        icon="sync-alt"
        className={runningJobs.length > 0 ? "fa-spin fa-fw" : "fa-fw"}
      />
    </Button>
  );

  if (queue.length === 0) {
    return button;
  }

  return (
    <>
      {button}

      <Modal
        show={show}
        onHide={() => setShow(false)}
        className="job-manager-dialog"
      >
        <Modal.Header closeButton>
          <Modal.Title>Job Manager</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <JobTable queue={queue} />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default JobManager;
