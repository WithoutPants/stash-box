/* eslint-disable no-console */

import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { onError } from "apollo-link-error";
import { ApolloLink } from "apollo-link";
import { createHttpLink } from "apollo-link-http";
import { setContext } from "apollo-link-context";

export const getPlatformURL = () => {
  const platformUrl = new URL(window.location.origin);

  if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
    platformUrl.port = process.env.REACT_APP_SERVER_PORT ?? "9998";

    if (process.env.REACT_APP_HTTPS === "true") {
      platformUrl.protocol = "https:";
    }
  }

  return platformUrl;
};

const httpLink = createHttpLink({
  uri: `${getPlatformURL().toString().slice(0, -1)}/graphql`,
  fetchOptions: {
    mode: "cors",
    credentials: "same-origin",
  },
});

const authLink = setContext((_, { headers, ...context }) => ({
  headers: {
    ...headers,
    ...(process.env.REACT_APP_APIKEY && {
      ApiKey: process.env.REACT_APP_APIKEY,
    }),
  },
  ...context,
}));

const createClient = () =>
  new ApolloClient({
    link: ApolloLink.from([
      authLink,
      onError(({ graphQLErrors, networkError }) => {
        if (graphQLErrors)
          graphQLErrors.forEach(({ message, locations, path }) =>
            console.log(
              `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
            )
          );
        if (networkError) console.log(`[Network error]: ${networkError}`);
      }),
      httpLink,
    ]),
    cache: new InMemoryCache({
      dataIdFromObject: (object) => (object as { id?: string }).id || null,
    }),
  });

export const setToken = (token: string) => {
  localStorage.setItem("token", token);
};

export default createClient;
