import { capsule } from "lakebed/server";

// The capsule stores nothing and exposes no mutations or write endpoints.
// Node file access and Effect validation stay in the local read endpoint.
export default capsule({
  mutations: {},
  name: "Local issue projection",
  queries: {},
  schema: {},
});
