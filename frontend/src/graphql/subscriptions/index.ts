import { SubscriptionHookOptions, useSubscription } from "@apollo/client";
import { loader } from "graphql.macro";
import { JobsSubscribe } from "../definitions/JobsSubscribe";

const JobsSubscription = loader("./Jobs.gql");

export const useJobsSubscribe = (
  options?: SubscriptionHookOptions<JobsSubscribe>
) => useSubscription<JobsSubscribe>(JobsSubscription, options);
