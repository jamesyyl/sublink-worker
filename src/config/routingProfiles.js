const JAMESLAB_STABLE_DOWNLOAD = '🧱 稳定下载';
const JAMESLAB_CF_DAILY = '☁️ CF 优先日常';
const JAMESLAB_AI_STATIC = '💬 AI 静态';
const JAMESLAB_META = '🧵 Meta/Threads';
const JAMESLAB_CLOUDFLARE = '☁️ Cloudflare 服务';

const STABLE_PROVIDER_EXCLUDE = [
	'0618edt',
	'edgetunnel',
	'workers.dev',
	'pages.dev'
];

const TRUE_NODE_FILTER = '(?i)(MPLS|IPLC|CN2|专属纯净静态住宅|直连|国际入口)';

export const ROUTING_PROFILES = {
	jameslab: {
		customRules: [
			{
				name: JAMESLAB_AI_STATIC,
				site: ['category-ai-!cn'],
				group: {
					type: 'url-test',
					useProvider: 'filtered',
					providerInclude: ['equal', 'equalvpn'],
					filter: '(?i)(专属纯净静态住宅|static|residential|住宅)',
					url: 'https://www.gstatic.com/generate_204',
					interval: 300,
					tolerance: 80,
					lazy: false
				}
			},
			{
				name: JAMESLAB_STABLE_DOWNLOAD,
				domain_suffix: [
					'github.com',
					'githubusercontent.com',
					'githubassets.com',
					'gitlab.com',
					'huggingface.co',
					'hf.co',
					'xethub.hf.co',
					'pypi.org',
					'pythonhosted.org',
					'npmjs.org',
					'npmjs.com',
					'nodejs.org',
					'docker.io',
					'docker.com',
					'ghcr.io',
					'pkg-containers.githubusercontent.com',
					'speed.cloudflare.com'
				],
				group: {
					type: 'url-test',
					useProvider: 'filtered',
					providerExclude: STABLE_PROVIDER_EXCLUDE,
					filter: TRUE_NODE_FILTER,
					url: 'https://www.gstatic.com/generate_204',
					interval: 300,
					tolerance: 80,
					lazy: false
				}
			},
			{
				name: JAMESLAB_META,
				domain_suffix: [
					'threads.com',
					'threads.net',
					'facebook.com',
					'fbcdn.net',
					'instagram.com',
					'cdninstagram.com'
				],
				group: {
					type: 'select',
					proxies: [
						JAMESLAB_STABLE_DOWNLOAD,
						JAMESLAB_AI_STATIC,
						JAMESLAB_CF_DAILY,
						'🚀 节点选择',
						'DIRECT',
						'REJECT'
					]
				}
			},
			{
				name: JAMESLAB_CLOUDFLARE,
				domain_suffix: [
					'subc.jl01nas.dpdns.org',
					'sublink-worker.fwingdd.workers.dev',
					'dash.cloudflare.com',
					'speed.cloudflare.com'
				],
				group: {
					type: 'select',
					proxies: [
						JAMESLAB_STABLE_DOWNLOAD,
						JAMESLAB_CF_DAILY,
						'🚀 节点选择',
						'DIRECT',
						'REJECT'
					]
				}
			},
			{
				name: JAMESLAB_CF_DAILY,
				group: {
					type: 'fallback',
					useProvider: 'all',
					providerPriority: [
						'0618edt',
						'edgetunnel'
					],
					url: 'https://www.gstatic.com/generate_204',
					interval: 300,
					lazy: false
				}
			}
		]
	}
};

function normalizeProfileName(name) {
	if (typeof name !== 'string') return '';
	return name.trim().toLowerCase().replace(/[-_\s]+/g, '');
}

export function getRoutingProfile(rawProfileName) {
	const normalized = normalizeProfileName(rawProfileName);
	if (!normalized) return null;
	if (normalized === 'jameslab' || normalized === 'james') {
		return ROUTING_PROFILES.jameslab;
	}
	return null;
}

export function mergeRoutingProfileCustomRules(customRules = [], rawProfileName) {
	const profile = getRoutingProfile(rawProfileName);
	if (!profile) return Array.isArray(customRules) ? customRules : [];
	const userRules = Array.isArray(customRules) ? customRules : [];
	return [
		...userRules,
		...profile.customRules.map(rule => ({
			...rule,
			group: rule.group ? { ...rule.group } : undefined
		}))
	];
}
