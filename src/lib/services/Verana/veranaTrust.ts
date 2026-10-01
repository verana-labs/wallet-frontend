import { IHttpProxy } from '@/lib/interfaces/IHttpProxy';
import { VERANA_INDEXER_URL } from '@/config';

export type VeranaTrustStatus = 'TRUSTED' | 'UNTRUSTED' | 'UNVERIFIED';

export type VeranaRole = 'issuer' | 'verifier';

/** An ECS credential of the counterparty, as the indexer accepted it. */
export interface VeranaCredential {
	/** The ECS schema title: ServiceCredential, OrganizationCredential, PersonaCredential, ... */
	ecsSchema?: string;
	/** `<issuer DID>#<uuid>`. */
	id?: string;
	credentialSubject?: Record<string, unknown>;
}

/** A Participant entry of the counterparty in the VPR. */
export interface VeranaParticipation {
	role?: string;
	state?: string;
	credentialSchemaId?: number;
}

export interface VeranaDetails {
	did: string;
	trustStatus: VeranaTrustStatus;
	credentials: VeranaCredential[];
	participations: VeranaParticipation[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const parseBody = (data: unknown): unknown => {
	try {
		return typeof data === 'string' ? JSON.parse(data) : data;
	} catch {
		return undefined;
	}
};

const getJson = async (httpProxy: IHttpProxy, url: string): Promise<unknown> => {
	try {
		const response = await httpProxy.get(url, { Accept: 'application/json' });
		if (response.status < 200 || response.status > 299) {
			return undefined;
		}
		return parseBody(response.data);
	} catch {
		return undefined;
	}
};

/** Verifiable Trust V4: the indexer resolves the trust of a DID. It knows only the DIDs of the VPR,
 *  so a 404 means that the DID is not in the VPR, which is a refusal, not an unknown result. */
export const resolveVeranaTrust = async (
	httpProxy: IHttpProxy,
	did: string,
): Promise<VeranaDetails | undefined> => {
	let status: number;
	let body: unknown;
	try {
		const response = await httpProxy.post(
			`${VERANA_INDEXER_URL}/v4/verifiable-trust/resolve`,
			{ did, ecsCredentials: true, participations: true },
			{ 'Content-Type': 'application/json', Accept: 'application/json' },
		);
		status = response.status;
		body = parseBody(response.data);
	} catch {
		return undefined;
	}
	if (status === 404) {
		return { did, trustStatus: 'UNTRUSTED', credentials: [], participations: [] };
	}
	if (status < 200 || status > 299 || !isRecord(body) || typeof body.trusted !== 'boolean') {
		return undefined;
	}
	return {
		did,
		trustStatus: body.trusted ? 'TRUSTED' : 'UNTRUSTED',
		credentials: Array.isArray(body.ecsCredentials) ? (body.ecsCredentials as VeranaCredential[]) : [],
		participations: Array.isArray(body.participations) ? (body.participations as VeranaParticipation[]) : [],
	};
};

/** The numeric CredentialSchema id that a VTJSC refers to (`vpr:verana:<chain>:cs:<id>`). */
const schemaIdFromVtjsc = async (httpProxy: IHttpProxy, vtjscId: string): Promise<number | undefined> => {
	if (!/^https?:\/\//i.test(vtjscId)) {
		return undefined;
	}
	const document = await getJson(httpProxy, vtjscId);
	const subject = isRecord(document) && isRecord(document.credentialSubject) ? document.credentialSubject : undefined;
	const jsonSchema = subject && isRecord(subject.jsonSchema) ? subject.jsonSchema : undefined;
	const ref = typeof jsonSchema?.$ref === 'string' ? jsonSchema.$ref : typeof subject?.id === 'string' ? subject.id : undefined;
	const match = ref?.match(/:cs:(\d+)$/);
	return match ? Number(match[1]) : undefined;
};

/** Q2/Q3: does the counterparty hold an active ISSUER (or VERIFIER) Participant entry on the
 *  schema of this VTJSC? The resolution of Q1 already lists the Participant entries of the DID. */
export const checkVeranaAccreditation = async (
	httpProxy: IHttpProxy,
	details: VeranaDetails,
	vtjscId: string,
	role: VeranaRole,
): Promise<boolean | undefined> => {
	const schemaId = await schemaIdFromVtjsc(httpProxy, vtjscId);
	if (schemaId === undefined) {
		return undefined;
	}
	const wanted = role === 'issuer' ? 'ISSUER' : 'VERIFIER';
	return details.participations.some(
		(participation) =>
			participation.role === wanted && participation.state === 'ACTIVE' && participation.credentialSchemaId === schemaId,
	);
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
