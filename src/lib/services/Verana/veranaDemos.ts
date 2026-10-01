import { IHttpProxy } from '@/lib/interfaces/IHttpProxy';
import { VeranaRole } from './veranaTrust';

export const VERANA_PLAYGROUND = 'https://playground.testnet.verana.network';

export interface VeranaDemoScenario {
	id: string;
	service: string;
	role: VeranaRole;
}

export const VERANA_DEMO_SCENARIOS: VeranaDemoScenario[] = [
	{ id: 'accreditedIssuer', service: 'demo-issuer-accredited', role: 'issuer' },
	{ id: 'unaccreditedIssuer', service: 'demo-issuer-unaccredited', role: 'issuer' },
	{ id: 'untrustedIssuer', service: 'demo-issuer-untrusted', role: 'issuer' },
	{ id: 'accreditedVerifier', service: 'demo-verifier-accredited', role: 'verifier' },
	{ id: 'unaccreditedVerifier', service: 'demo-verifier-unaccredited', role: 'verifier' },
	{ id: 'untrustedVerifier', service: 'demo-verifier-untrusted', role: 'verifier' },
];

export const mintVeranaDemo = async (httpProxy: IHttpProxy, scenario: VeranaDemoScenario): Promise<string | undefined> => {
	const response = await httpProxy.get(
		`${VERANA_PLAYGROUND}/api/demo/${scenario.service}?format=openid4vc-sdjwt&signer=x5c`,
		{ Accept: 'application/json' },
	);
	if (response.status < 200 || response.status > 299) {
		return undefined;
	}
	const body = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
	const url = typeof body === 'object' && body !== null ? (body as { url?: unknown }).url : undefined;
	if (typeof url !== 'string' || !url.includes('?')) {
		return undefined;
	}
	return `/?${url.split('?')[1]}`;
};
