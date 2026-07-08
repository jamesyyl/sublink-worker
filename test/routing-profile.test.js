import { describe, it, expect, vi, afterEach } from 'vitest';
import yaml from 'js-yaml';

vi.mock('../src/parsers/subscription/httpSubscriptionFetcher.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        fetchSubscriptionWithFormat: vi.fn()
    };
});

import { fetchSubscriptionWithFormat } from '../src/parsers/subscription/httpSubscriptionFetcher.js';
import { ClashConfigBuilder } from '../src/builders/ClashConfigBuilder.js';
import { SingboxConfigBuilder } from '../src/builders/SingboxConfigBuilder.js';
import { SurgeConfigBuilder } from '../src/builders/SurgeConfigBuilder.js';
import { mergeRoutingProfileCustomRules } from '../src/config/index.js';

const mockClashYaml = `
proxies:
  - name: HK-Node
    type: ss
    server: hk.example.com
    port: 443
    cipher: aes-128-gcm
    password: test123
`;

const directProxyInput = [
    'ss://YWVzLTI1Ni1nY206dGVzdA==@us1.example.com:8388#US-Node-1',
    'ss://YWVzLTI1Ni1nY206dGVzdA==@jp1.example.com:8388#JP-Node-1'
].join('\n');

describe('routing profiles', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('builds JamesLab Clash policy groups with provider filtering', async () => {
        fetchSubscriptionWithFormat.mockImplementation((url) => Promise.resolve({
            content: mockClashYaml,
            format: 'clash',
            url
        }));

        const input = [
            'https://equalvpn.example.com/clash?token=redacted',
            'https://forest.example.com/clash?token=redacted',
            'https://0618edt.jl01nas.dpdns.org/sub?token=redacted'
        ].join('\n');

        const builder = new ClashConfigBuilder(
            input,
            'minimal',
            mergeRoutingProfileCustomRules([], 'jameslab'),
            null,
            'zh-CN',
            'clash-verge'
        );
        const config = yaml.load(await builder.build());
        const providerNameByUrl = Object.fromEntries(
            Object.entries(config['proxy-providers']).map(([name, provider]) => [provider.url, name])
        );

        const equalProvider = providerNameByUrl['https://equalvpn.example.com/clash?token=redacted'];
        const forestProvider = providerNameByUrl['https://forest.example.com/clash?token=redacted'];
        const edgetunnelProvider = providerNameByUrl['https://0618edt.jl01nas.dpdns.org/sub?token=redacted'];

        const stableGroup = config['proxy-groups'].find(group => group.name === '🧱 稳定下载');
        expect(stableGroup.type).toBe('url-test');
        expect(stableGroup.use).toContain(equalProvider);
        expect(stableGroup.use).toContain(forestProvider);
        expect(stableGroup.use).not.toContain(edgetunnelProvider);
        expect(stableGroup.filter).toContain('MPLS');

        const aiGroup = config['proxy-groups'].find(group => group.name === '💬 AI 静态');
        expect(aiGroup.type).toBe('select');
        expect(aiGroup.use).toEqual([equalProvider]);
        expect(aiGroup.filter).toContain('住宅');
        expect(aiGroup.proxies).toEqual(['DIRECT', 'REJECT']);

        const cfDailyGroup = config['proxy-groups'].find(group => group.name === '☁️ CF 优先日常');
        expect(cfDailyGroup.type).toBe('fallback');
        expect(cfDailyGroup.use[0]).toBe(edgetunnelProvider);

        expect(config.rules).toContain('DOMAIN-SUFFIX,threads.com,🧵 Meta/Threads');
        expect(config.rules).toContain('DOMAIN-SUFFIX,subc.jl01nas.dpdns.org,☁️ Cloudflare 服务');
        expect(config.rules).toContain('RULE-SET,category-ai-!cn,💬 AI 静态');
    });

    it('adds JamesLab domain routes to Sing-box output', async () => {
        const builder = new SingboxConfigBuilder(
            directProxyInput,
            'minimal',
            mergeRoutingProfileCustomRules([], 'jameslab'),
            null,
            'zh-CN',
            '',
            false,
            false,
            null,
            null,
            '1.12',
            true
        );

        await builder.build();

        const metaOutbound = builder.config.outbounds.find(outbound => outbound.tag === '🧵 Meta/Threads');
        expect(metaOutbound).toBeDefined();

        const metaRule = builder.config.route.rules.find(rule =>
            Array.isArray(rule.domain_suffix) && rule.domain_suffix.includes('threads.com')
        );
        expect(metaRule.outbound).toBe('🧵 Meta/Threads');
    });

    it('adds JamesLab domain routes to Surge output', async () => {
        const builder = new SurgeConfigBuilder(
            directProxyInput,
            'minimal',
            mergeRoutingProfileCustomRules([], 'jameslab'),
            null,
            'zh-CN',
            '',
            false,
            true
        );

        await builder.build();
        const configText = builder.formatConfig();

        expect(configText).toContain('🧵 Meta/Threads = select');
        expect(configText).toContain('DOMAIN-SUFFIX,threads.com,🧵 Meta/Threads');
        expect(configText).toContain('DOMAIN-SUFFIX,subc.jl01nas.dpdns.org,☁️ Cloudflare 服务');
    });
});
