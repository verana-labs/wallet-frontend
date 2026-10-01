import { useEffect, useMemo, useState } from 'react';
import { useHttpProxy } from '../HttpProxy/HttpProxy';
import { VERANA_NETWORK } from '@/config';
import {
	checkVeranaAccreditation,
	resolveVeranaTrust,
	veranaDidFromClientId,
	veranaDidFromOrigin,
	veranaSchemaFromVct,
	VeranaCredential,
	VeranaDetails,
	VeranaRole,
	VeranaTrustStatus,
} from './veranaTrust';

export interface VeranaCounterparty {
	role: VeranaRole;
	did?: string;
	/** A `decentralized_identifier` client_id names the DID; an `x509_hash` one does not. */
	clientId?: string;
	/** Any URL on the counterparty's origin; its `/.well-known/did.json` names the DID. */
	originUrl?: string;
	/** The `vct` of the credential being offered or asked for, which leads to the VTJSC id. */
	vctUrl?: string;
	credentialName?: string;
}

export interface VeranaIdentity {
	name?: string;
	description?: string;
	countryCode?: string;
	address?: string;
	registryId?: string;
	minimumAgeRequired?: number;
	termsUrl?: string;
	privacyUrl?: string;
}

export interface VeranaTrustState {
	did?: string;
	trustStatus: VeranaTrustStatus;
	isResolving: boolean;
	/** The name of the Verana network when it is not a production network, for the badge. */
	networkBadge?: string;
	service?: VeranaIdentity;
	organization?: VeranaIdentity;
	serviceSelfIssued: boolean;
	organizationSelfIssued: boolean;
	/** Q2/Q3. `undefined` is could-not-determine, which must read differently from a refusal. */
	accredited?: boolean;
	isCheckingAccreditation: boolean;
	credentialName?: string;
	role: VeranaRole;
	/** Accept and share must be disabled while this is true. */
	blocked: boolean;
}

interface Resolution {
	did?: string;
	details?: VeranaDetails;
	isResolving: boolean;
	accredited?: boolean;
	isCheckingAccreditation: boolean;
	schemaName?: string;
}

const PENDING: Resolution = { isResolving: true, isCheckingAccreditation: false };

const text = (credential: VeranaCredential | undefined, name: string): string | undefined => {
	const value = credential?.credentialSubject?.[name];
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const httpUrl = (value: string | undefined): string | undefined => {
	if (!value) {
		return undefined;
	}
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined;
	} catch {
		return undefined;
	}
};

const findCredential = (details: VeranaDetails | undefined, ecsSchema: string): VeranaCredential | undefined =>
	details?.credentials.find((credential) => credential.ecsSchema === ecsSchema);

/** The credential id is `<issuer DID>#<uuid>`. */
const isSelfIssued = (credential: VeranaCredential | undefined, did?: string): boolean =>
	Boolean(credential?.id && did && credential.id.split('#')[0] === did);

/** The indexer lists only the ECS credentials it accepted. */
const readIdentity = (credential: VeranaCredential | undefined): VeranaIdentity | undefined => {
	if (!credential) {
		return undefined;
	}
	const age = credential.credentialSubject?.minimumAgeRequired;
	return {
		name: text(credential, 'name'),
		description: text(credential, 'description'),
		countryCode: text(credential, 'countryCode')?.toUpperCase(),
		address: text(credential, 'address'),
		registryId: text(credential, 'registryId'),
		minimumAgeRequired: typeof age === 'number' ? age : undefined,
		termsUrl: httpUrl(text(credential, 'termsAndConditionsUri')),
		privacyUrl: httpUrl(text(credential, 'privacyPolicyUri')),
	};
};

export const useVeranaTrust = (counterparty?: VeranaCounterparty): VeranaTrustState => {
	const httpProxy = useHttpProxy();
	const [resolution, setResolution] = useState<Resolution>(PENDING);

	const role = counterparty?.role ?? 'issuer';
	const { did: knownDid, clientId, originUrl, vctUrl, credentialName } = counterparty ?? {};

	useEffect(() => {
		let cancelled = false;
		setResolution(PENDING);

		(async () => {
			const did =
				knownDid ??
				veranaDidFromClientId(clientId) ??
				(originUrl ? await veranaDidFromOrigin(httpProxy, originUrl) : undefined);
			if (cancelled) {
				return;
			}
			if (!did) {
				setResolution({ isResolving: false, isCheckingAccreditation: false });
				return;
			}

			const details = await resolveVeranaTrust(httpProxy, did);
			if (cancelled) {
				return;
			}
			setResolution({ did, details, isResolving: false, isCheckingAccreditation: Boolean(vctUrl) });
			if (!vctUrl) {
				return;
			}

			const { vtjscId, name } = await veranaSchemaFromVct(httpProxy, vctUrl);
			const accredited =
				vtjscId && details ? await checkVeranaAccreditation(httpProxy, details, vtjscId, role) : undefined;
			if (cancelled) {
				return;
			}
			setResolution((current) => ({ ...current, accredited, schemaName: name, isCheckingAccreditation: false }));
		})();

		return () => {
			cancelled = true;
		};
	}, [httpProxy, knownDid, clientId, originUrl, vctUrl, role]);

	return useMemo(() => {
		const { did, details, isResolving, accredited, isCheckingAccreditation, schemaName } = resolution;
		const trustStatus: VeranaTrustStatus = details?.trustStatus ?? 'UNVERIFIED';
		const serviceCredential = findCredential(details, 'ServiceCredential');
		const organizationCredential = findCredential(details, 'OrganizationCredential');

		return {
			did,
			trustStatus,
			isResolving,
			networkBadge: VERANA_NETWORK === 'mainnet' ? undefined : VERANA_NETWORK.toUpperCase(),
			service: readIdentity(serviceCredential),
			organization: readIdentity(organizationCredential),
			serviceSelfIssued: isSelfIssued(serviceCredential, did),
			organizationSelfIssued: isSelfIssued(organizationCredential, did),
			accredited,
			isCheckingAccreditation,
			credentialName: credentialName ?? schemaName,
			role,
			// A counterparty that never published a DID is outside Verana entirely and keeps the
			// wallet's normal flow; only a DID the registry actively distrusts is blocked.
			blocked:
				isResolving ||
				(Boolean(did) &&
					(isCheckingAccreditation ||
						trustStatus === 'UNTRUSTED' ||
						accredited === false)),
		};
	}, [resolution, credentialName, role]);
};
