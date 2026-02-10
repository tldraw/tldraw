var _a, _b, _c, _d, _e, _f, _g;
function decode(component) {
	if (!component)
		return component;
	return decodeURIComponent(component);
}
const hostInfo = {
	version: "4a33744",
	scopeCanvas: JSON.parse("true"),
};
const projectIdRegex = /^\/projects\/(?<prefix>(?:(?:[A-Za-z0-9]+-)*[A-Za-z0-9]+--)?)(?<id>[A-Za-z0-9]{20})(?<accessToken>(?:-[A-Za-z0-9]+)?)/;
const projectMatch = location.pathname.match(projectIdRegex);
const projectId = (_a = projectMatch === null || projectMatch === void 0 ? void 0 : projectMatch.groups) === null || _a === void 0 ? void 0 : _a.id;
const projectAccessToken = ((_b = projectMatch === null || projectMatch === void 0 ? void 0 : projectMatch.groups) === null || _b === void 0 ? void 0 : _b.accessToken) || undefined;
const shareUUIDRegex = /^\/share\/(?<shareId>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:\/(?<frameId>[^/]+))?/;
const shareRegex = /^\/share\/(?<prefix>(?:(?:[A-Za-z0-9]+-)*[A-Za-z0-9]+--)?)(?<shareId>[A-Za-z0-9]+)(?:\/(?<frameId>[^/]+))?/;
const shareMatch = (_c = location.pathname.match(shareUUIDRegex)) !== null && _c !== void 0 ? _c : location.pathname.match(shareRegex);
const shareId = (_d = shareMatch === null || shareMatch === void 0 ? void 0 : shareMatch.groups) === null || _d === void 0 ? void 0 : _d.shareId;
const frameId = decode((_e = shareMatch === null || shareMatch === void 0 ? void 0 : shareMatch.groups) === null || _e === void 0 ? void 0 : _e.frameId);
const embedRegex = /^\/embed\/(?<prefix>(?:(?:[A-Za-z0-9]+-)*[A-Za-z0-9]+--)?)(?<shareId>[A-Za-z0-9]+)(?:\/(?<frameId>[^/]+))?/;
const embedMatch = location.pathname.match(embedRegex);
const embedShareId = (_f = embedMatch === null || embedMatch === void 0 ? void 0 : embedMatch.groups) === null || _f === void 0 ? void 0 : _f.shareId;
const embedFrameId = decode((_g = embedMatch === null || embedMatch === void 0 ? void 0 : embedMatch.groups) === null || _g === void 0 ? void 0 : _g.frameId);
let canvas = "https://framercanvas.com";
if (projectId && hostInfo.scopeCanvas) {
	canvas = canvas.replace("//", `//project-${projectId.toLowerCase()}.`);
}
const bootstrap = {
	services: {
		api: "https://api.framer.com",
		app: "https://framer.com",
		canvas,
		events: "https://events.framer.com",
		login: "https://framer.com/login",
		userContent: "https://framerusercontent.com",
		modulesCDN: "https://framerusercontent.com/modules",
		modulesShortLink: "https://framer.com/m",
		previewDomain: "framer.app",
	},
	hostInfo: {
		version: hostInfo.version,
	},
};
if (projectId) {
	bootstrap.project = { id: projectId, accessToken: projectAccessToken };
}
if (shareId) {
	bootstrap.share = { id: shareId, frameId };
}
if (embedShareId) {
	bootstrap.embed = { shareId: embedShareId, frameId: embedFrameId };
}
Object.freeze(bootstrap);
window.bootstrap = bootstrap;
