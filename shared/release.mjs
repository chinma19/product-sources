// Build-time constants share one identity across the client and Worker artifact.
// Source-based tests run without esbuild defines and use the explicit development identity.
export const clientReleaseId=typeof __IHF_RELEASE_ID__==='string'?__IHF_RELEASE_ID__:'development';
export const selectionProtocol=2;
export const buildInfo=typeof __IHF_RELEASE_INFO__==='object'&&__IHF_RELEASE_INFO__
 ?__IHF_RELEASE_INFO__
 :{releaseId:clientReleaseId,selectionProtocol,assets:{}};
