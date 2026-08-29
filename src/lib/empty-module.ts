// Stand-in for optional dependencies that are aliased away at build time.
// @opentelemetry/sdk-node requires the Jaeger exporter eagerly even when it is
// unused; both the webpack and turbopack configs point it here.
const emptyModule = {};
export default emptyModule;
