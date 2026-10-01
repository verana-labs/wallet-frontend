import { IHttpProxy } from '@/lib/interfaces/IHttpProxy';

export const VERANA_RESOLVER = 'https://resolver.testnet.verana.network/v1/trust';

export type VeranaTrustStatus = 'TRUSTED' | 'PARTIAL' | 'UNTRUSTED' | 'UNVERIFIED';

export type VeranaRole = 'issuer' | 'verifier';

export interface VeranaCredential {
	result?: string;
	issuedBy?: string;
	ecsType?: string;
	claims?: Record<string, unknown>;
}

export interface VeranaDetails {
	did: string;
	trustStatus: VeranaTrustStatus;
	production?: boolean;
	credentials?: VeranaCredential[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const getJson = async (httpProxy: IHttpProxy, url: string): Promise<unknown> => {
	try {
		const response = await httpProxy.get(url, { Accept: 'application/json' });
		if (response.status < 200 || response.status > 299) {
			return undefined;
		}
		return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
	} catch {
		return undefined;
	}
};

const getResolveResponse = async (httpProxy: IHttpProxy, did: string): Promise<{ status: number; body: unknown }> => {
	try {
		const response = await httpProxy.get(`${VERANA_RESOLVER}/resolve?did=${encodeURIComponent(did)}&detail=full`, { Accept: 'application/json' });
		const body = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
		return { status: response.status, body };
	} catch {
		return { status: 0, body: undefined };
	}
};

const refreshVeranaEvaluation = async (httpProxy: IHttpProxy, did: string): Promise<void> => {
	try {
		await httpProxy.post(`${VERANA_RESOLVER}/refresh`, { did }, { 'Content-Type': 'application/json' });
	} catch {
		return;
	}
};

// The resolver drops an evaluation an hour after it was made and answers 404 until asked to redo it.
export const resolveVeranaTrust = async (
	httpProxy: IHttpProxy,
	did: string,
): Promise<VeranaDetails | undefined> => {
	let { status, body } = await getResolveResponse(httpProxy, did);
	if (status === 404) {
		await refreshVeranaEvaluation(httpProxy, did);
		({ status, body } = await getResolveResponse(httpProxy, did));
	}
	if (status < 200 || status > 299 || !isRecord(body) || typeof body.trustStatus !== 'string') {
		return undefined;
	}
	return body as unknown as VeranaDetails;
};

export const checkVeranaAccreditation = async (
	httpProxy: IHttpProxy,
	did: string,
	vtjscId: string,
	role: VeranaRole,
): Promise<boolean | undefined> => {
	const body = await getJson(
		httpProxy,
		`${VERANA_RESOLVER}/${role}-authorization?did=${encodeURIComponent(did)}&vtjscId=${encodeURIComponent(vtjscId)}`,
	);
	if (!isRecord(body)) {
		return undefined;
	}
	return typeof body.authorized === 'boolean' ? body.authorized : undefined;
};

const DID_PREFIXES = ['did:webvh:', 'did:web:'];

export const veranaDidFromClientId = (clientId: string | undefined): string | undefined => {
	if (!clientId) {
		return undefined;
	}
	const candidate = clientId.startsWith('decentralized_identifier:') ? clientId.slice('decentralized_identifier:'.length) : clientId;
	return DID_PREFIXES.some((prefix) => candidate.startsWith(prefix)) ? candidate : undefined;
};

/** The registry keys its evaluations on the did:webvh, whose SCID only `alsoKnownAs` carries;
 *  the did:web in `id` resolves to the same document but has no trust evaluation. */
export const veranaDidFromOrigin = async (
	httpProxy: IHttpProxy,
	url: string,
): Promise<string | undefined> => {
	let origin: string;
	try {
		origin = new URL(url).origin;
	} catch {
		return undefined;
	}

	const document = await getJson(httpProxy, `${origin}/.well-known/did.json`);
	if (!isRecord(document)) {
		return undefined;
	}

	const alsoKnownAs = Array.isArray(document.alsoKnownAs) ? document.alsoKnownAs : [];
	const candidates = [...alsoKnownAs, document.id];
	return candidates.find(
		(candidate): candidate is string =>
			typeof candidate === 'string' && DID_PREFIXES.some((prefix) => candidate.startsWith(prefix)),
	);
};

/** Q2/Q3 are keyed on the ecosystem VTJSC id, which neither an offer nor a DCQL query carries.
 *  Both name a `vct` instead, and only that document points at the schema credential. */
export const veranaSchemaFromVct = async (
	httpProxy: IHttpProxy,
	vctUrl: string,
): Promise<{ vtjscId?: string; name?: string }> => {
	if (!/^https?:\/\//i.test(vctUrl)) {
		return {};
	}
	const document = await getJson(httpProxy, vctUrl);
	if (!isRecord(document)) {
		return {};
	}
	const related = document.relatedJsonSchemaCredentialId;
	const name = document.name;
	return {
		vtjscId: typeof related === 'string' && related.length > 0 ? related : undefined,
		name: typeof name === 'string' && name.length > 0 ? name : undefined,
	};
};
