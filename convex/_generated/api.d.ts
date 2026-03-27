/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chatConversations from "../chatConversations.js";
import type * as conversations from "../conversations.js";
import type * as dashboards from "../dashboards.js";
import type * as dataRows from "../dataRows.js";
import type * as datasets from "../datasets.js";
import type * as http from "../http.js";
import type * as sharing from "../sharing.js";
import type * as teams from "../teams.js";
import type * as users from "../users.js";
import type * as widgets from "../widgets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chatConversations: typeof chatConversations;
  conversations: typeof conversations;
  dashboards: typeof dashboards;
  dataRows: typeof dataRows;
  datasets: typeof datasets;
  http: typeof http;
  sharing: typeof sharing;
  teams: typeof teams;
  users: typeof users;
  widgets: typeof widgets;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
