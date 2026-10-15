import React from 'react';
import { Check, Clock, FileText, Shield, X } from 'lucide-react';
import { VeranaIdentity, VeranaTrustState } from '@/lib/services/Verana/useVeranaTrust';

// Fixed v3 palette (playground/public/trust-card): the card must look identical in every wallet.
const PALETTE = [
	'[--vtc-ink:#111827]', 'dark:[--vtc-ink:#f9fafb]',
	'[--vtc-sub:#6b7280]', 'dark:[--vtc-sub:#9ca3af]',
	'[--vtc-faint:#9ca3af]', 'dark:[--vtc-faint:#6b7280]',
	'[--vtc-line:#e5e7eb]', 'dark:[--vtc-line:#1f2937]',
	'[--vtc-card:#ffffff]', 'dark:[--vtc-card:#111827]',
	'[--vtc-body:#374151]', 'dark:[--vtc-body:#d1d5db]',
	'[--vtc-ok:#059669]',
	'[--vtc-ok-soft:#ecfdf5]', 'dark:[--vtc-ok-soft:#022c22]',
	'[--vtc-warn:#d97706]',
	'[--vtc-warn-soft:#fffbeb]', 'dark:[--vtc-warn-soft:#292014]',
	'[--vtc-warn-line:#fde68a]', 'dark:[--vtc-warn-line:#a16207]',
	'[--vtc-bad:#dc2626]',
	'[--vtc-bad-soft:#fef2f2]', 'dark:[--vtc-bad-soft:#2a1113]',
	'[--vtc-brand:#7c3aed]',
	'[--vtc-brand-soft:#ede9fe]', 'dark:[--vtc-brand-soft:#2e1065]',
	'[--vtc-chip:#f3f4f6]', 'dark:[--vtc-chip:#1f2937]',
].join(' ');

const VERDICT = {
	RESOLVING: { label: 'CHECKING…', tone: 'var(--vtc-sub)', border: 'var(--vtc-line)', dot: 'var(--vtc-faint)', rail: 'var(--vtc-line)' },
	TRUSTED: { label: 'TRUSTED', tone: 'var(--vtc-ok)', border: 'var(--vtc-ok)', dot: 'var(--vtc-ok)', rail: 'var(--vtc-ok)' },
	UNTRUSTED: { label: 'UNTRUSTED', tone: 'var(--vtc-bad)', border: 'var(--vtc-bad)', dot: 'var(--vtc-bad)', rail: 'var(--vtc-bad)' },
	UNVERIFIED: { label: 'UNVERIFIED', tone: 'var(--vtc-sub)', border: 'var(--vtc-line)', dot: 'var(--vtc-faint)', rail: 'var(--vtc-line)' },
} as const;

const VeranaMark: React.FC<{ size: number }> = ({ size }) => (
	<svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="shrink-0">
		<defs>
			<linearGradient id={`vtc-g${size}`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
				<stop offset="0%" stopColor="#763EF0" />
				<stop offset="100%" stopColor="#9F7AEA" />
			</linearGradient>
		</defs>
		<rect width="64" height="64" rx="14" fill={`url(#vtc-g${size})`} />
		<g transform="translate(12.3 13.1) scale(0.7407)" fill="#fff">
			<path d="M26.9932 51.6972L5.805 11.0977L2.91263 16.2161L0 10.6048L5.98725 0L26.9932 40.2483L47.9993 0L54 10.6217L51.0773 16.2161L48.1849 11.0977L26.9932 51.6972Z" />
			<path d="M13.696 0L26.9935 25.4637L39.9367 0H13.696Z" />
		</g>
	</svg>
);

const QueryMark: React.FC<{ size: number }> = ({ size }) => (
	<svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
		<path d="M9.2 9a3 3 0 1 1 4 2.8c-.9.4-1.2 1.1-1.2 2" />
		<circle cx="12" cy="17.6" r="1.15" fill="currentColor" stroke="none" />
	</svg>
);

// Drawn, never typed: emoji regional indicators fall back inconsistently across platforms.
const FLAG_ART: Record<string, React.ReactElement> = {
	CH: (
		<>
			<rect width="20" height="20" rx="3" fill="#DA291C" />
			<path d="M8.6 4h2.8v4.6H16v2.8h-4.6V16H8.6v-4.6H4V8.6h4.6z" fill="#fff" />
		</>
	),
	KY: (
		<>
			<rect width="20" height="20" rx="3" fill="#00247D" />
			<path d="M0 0h10v7H0z" fill="#012169" />
			<path d="M0 0l10 7M10 0L0 7" stroke="#fff" strokeWidth="1.4" />
			<path d="M5 0v7M0 3.5h10" stroke="#fff" strokeWidth="2.2" />
			<path d="M5 0v7M0 3.5h10" stroke="#C8102E" strokeWidth="1.2" />
		</>
	),
	FR: (
		<>
			<rect width="20" height="20" rx="3" fill="#fff" />
			<path d="M0 3a3 3 0 0 1 3-3h3.67v20H3a3 3 0 0 1-3-3z" fill="#002395" />
			<path d="M13.33 0H17a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-3.67z" fill="#ED2939" />
		</>
	),
	DE: (
		<>
			<rect width="20" height="20" rx="3" fill="#D00" />
			<path d="M3 0h14a3 3 0 0 1 3 3v3.67H0V3a3 3 0 0 1 3-3z" fill="#000" />
			<path d="M0 13.33h20V17a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3z" fill="#FFCE00" />
		</>
	),
};

const CountryFlag: React.FC<{ code?: string }> = ({ code }) => {
	if (!code) {
		return null;
	}
	const art = FLAG_ART[code];
	if (!art) {
		return (
			<span className="rounded bg-[var(--vtc-chip)] px-1.5 py-0.5 text-[0.7rem] font-bold tracking-wide text-[var(--vtc-sub)]">
				{code}
			</span>
		);
	}
	return (
		<svg viewBox="0 0 20 20" width={26} height={26} role="img" aria-label={code} className="shrink-0">
			{art}
		</svg>
	);
};

const initials = (name?: string) =>
	(name ?? '')
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0])
		.join('')
		.toUpperCase() || '?';

type RowTone = 'ok' | 'bad' | 'none';

const Row: React.FC<{
	kicker: string;
	tone: RowTone;
	rail: string;
	last?: boolean;
	identity?: VeranaIdentity;
	fallbackName: string;
	fallbackDescription: string;
	selfIssued?: boolean;
	children?: React.ReactNode;
}> = ({ kicker, tone, rail, last, identity, fallbackName, fallbackDescription, selfIssued, children }) => (
	<div className="relative grid grid-cols-[3.2rem_1fr] mt-6 first:mt-0">
		<span
			className="absolute left-[1.52rem] top-[3.2rem] w-[2.5px] rounded-[2px]"
			style={{ background: rail, bottom: last ? '0.4rem' : '-1.5rem' }}
		/>
		<span
			className={`z-1 grid h-[3.05rem] w-[3.05rem] place-items-center rounded-full border-[2.5px] ${tone === 'ok'
				? 'border-[var(--vtc-ok)] bg-[var(--vtc-ok-soft)] text-[var(--vtc-ok)]'
				: tone === 'bad'
					? 'border-[var(--vtc-bad)] bg-[var(--vtc-bad-soft)] text-[var(--vtc-bad)]'
					: 'border-[var(--vtc-line)] bg-[var(--vtc-chip)] text-[var(--vtc-faint)]'
				}`}
		>
			{tone === 'ok' ? <Check size={19} strokeWidth={3} /> : tone === 'bad' ? <X size={17} strokeWidth={3} /> : <QueryMark size={19} />}
		</span>
		<div className="min-w-0">
			<div className="pt-1.5 text-[0.8rem] font-extrabold uppercase tracking-[0.09em] text-[var(--vtc-sub)]">
				{kicker}
			</div>
			{tone === 'ok' && identity ? (
				<div className="mt-2 grid grid-cols-[3.6rem_1fr] gap-4">
					<span className="relative grid h-[3.6rem] w-[3.6rem] place-items-center rounded-2xl bg-[var(--vtc-brand)] text-[1.1rem] font-extrabold text-white">
						{initials(identity.name)}
						<span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-[var(--vtc-card)] text-[var(--vtc-ok)]">
							<Check size={14} strokeWidth={3.4} />
						</span>
					</span>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2 text-[1.42rem] font-extrabold leading-tight tracking-[-0.015em]">
							<span className="min-w-0 break-words">{identity.name}</span>
							<CountryFlag code={identity.countryCode} />
						</div>
						{children}
					</div>
				</div>
			) : (
				<div className="mt-1.5">
					<div
						className={`font-bold leading-snug ${tone === 'bad' ? 'text-[1.28rem] text-[var(--vtc-bad)]' : 'text-[1.1rem] text-[var(--vtc-sub)]'}`}
					>
						{identity?.name ?? fallbackName}
					</div>
					<div className="mt-1 text-[var(--vtc-sub)]">{identity ? identity.description : fallbackDescription}</div>
					{selfIssued && (
						<div className="mt-1 text-[var(--vtc-faint)]">
							Issued by this service to itself, so nothing independent verifies it.
						</div>
					)}
				</div>
			)}
		</div>
	</div>
);

const AssetLink: React.FC<{ icon: React.ReactNode; label: string; href?: string }> = ({ icon, label, href }) => {
	if (!href) {
		return null;
	}
	return (
		<div className="flex items-center gap-2.5 py-1.5">
			<span className="shrink-0 text-[var(--vtc-ink)]">{icon}</span>
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				className="font-bold text-[var(--vtc-brand)] hover:underline"
			>
				{label}
			</a>
			<span className="ml-auto whitespace-nowrap italic text-[var(--vtc-faint)]">no digest</span>
		</div>
	);
};

const independentlyVerified = (trust: VeranaTrustState): number =>
	[
		trust.service && !trust.serviceSelfIssued,
		trust.organization && !trust.organizationSelfIssued,
	].filter(Boolean).length;

const noteFor = (trust: VeranaTrustState): string => {
	if (trust.isResolving) {
		return 'Checking the Verana public registry…';
	}
	if (trust.trustStatus === 'UNVERIFIED') {
		return 'The Verana resolver could not be reached. This counterparty is neither trusted nor untrusted.';
	}
	const verified = independentlyVerified(trust);
	if (verified === 2) {
		return trust.trustStatus === 'TRUSTED'
			? 'Both identity credentials verified against the Verana public registry'
			: `Both identity credentials verified, but the registry does not clear this ${trust.role}.`;
	}
	if (verified === 1) {
		return `Only one of the two identity credentials is verified. Nothing independently names who operates this ${trust.role}.`;
	}
	if (trust.service || trust.organization) {
		return `Both identity credentials are issued by this ${trust.role} to itself, so nothing independent names who operates it.`;
	}
	return `Neither identity credential verified. Nothing names who operates this ${trust.role}.`;
};

export const VeranaTrustCard: React.FC<{ trust: VeranaTrustState }> = ({ trust }) => {
	if (!trust.did && !trust.isResolving) {
		return null;
	}

	const verdict = trust.isResolving ? VERDICT.RESOLVING : VERDICT[trust.trustStatus];
	// A self-issued credential is a claim, not a verification, so it never earns the face of the card.
	const toneFor = (identity: VeranaIdentity | undefined, selfIssued: boolean): RowTone =>
		trust.isResolving ? 'none' : !identity ? 'bad' : selfIssued ? 'none' : 'ok';
	const serviceTone = toneFor(trust.service, trust.serviceSelfIssued);
	const organizationTone = toneFor(trust.organization, trust.organizationSelfIssued);
	const age = trust.service?.minimumAgeRequired;
	const gated = typeof age === 'number' && age > 0;
	const hasConditions = trust.service && (typeof age === 'number' || trust.service.termsUrl || trust.service.privacyUrl);
	const party = trust.service?.name ?? 'This DID';
	const verb = trust.role === 'issuer' ? 'authorized issuer' : 'authorized verifier';
	const moot = trust.accredited === true && trust.trustStatus !== 'TRUSTED';
	const showAsk = Boolean(trust.credentialName);

	return (
		<div className={`${PALETTE} w-full max-w-[30rem] text-[var(--vtc-ink)]`}>
			<div className="rounded-[1.75rem] border border-[var(--vtc-line)] bg-[var(--vtc-card)] p-[1.6rem]">
				<div className="mb-6 flex items-center gap-3">
					<span className="h-[0.7rem] w-[0.7rem] shrink-0 rounded-full" style={{ background: verdict.dot }} />
					<code className="min-w-0 flex-1 truncate font-mono text-[0.9rem] text-[var(--vtc-sub)]" title={trust.did}>
						{trust.did}
					</code>
					{trust.networkBadge && (
						<span className="shrink-0 rounded-md border-[1.5px] border-[var(--vtc-warn-line)] px-1.5 text-[0.68rem] font-extrabold tracking-[0.08em] text-[var(--vtc-warn)]">
							{trust.networkBadge}
						</span>
					)}
					<VeranaMark size={30} />
				</div>

				<Row
					kicker="Service"
					tone={serviceTone}
					rail={verdict.rail}
					identity={trust.service}
					fallbackName={trust.isResolving ? 'Checking…' : 'No ECS-Service credential presented'}
					fallbackDescription={trust.isResolving ? 'Not checked yet' : 'No verified claims, so none are shown.'}
					selfIssued={trust.serviceSelfIssued}
				>
					{trust.service?.description && <div className="mt-1 text-[var(--vtc-body)]">{trust.service.description}</div>}
				</Row>

				<Row
					kicker="Operated by"
					tone={organizationTone}
					rail={verdict.rail}
					last
					identity={trust.organization}
					fallbackName={trust.isResolving ? 'Checking…' : 'No ECS-Organization credential presented'}
					fallbackDescription={trust.isResolving ? 'Not checked yet' : 'Nothing on the registry names an operator.'}
					selfIssued={trust.organizationSelfIssued}
				>
					{trust.organization?.address && <div className="mt-1 text-[var(--vtc-body)]">{trust.organization.address}</div>}
					{trust.organization?.registryId && (
						<div className="mt-2.5 inline-flex items-baseline gap-2.5 rounded-xl border border-[var(--vtc-line)] bg-[var(--vtc-chip)] px-3.5 py-1.5">
							<b className="text-[0.78rem] font-bold tracking-[0.07em] text-[var(--vtc-sub)]">REG</b>
							<code className="font-mono text-[0.9rem] font-semibold">{trust.organization.registryId}</code>
						</div>
					)}
				</Row>

				<div
					className="mt-6 inline-flex items-center gap-3 rounded-2xl border-[2.5px] py-2 pl-2.5 pr-6 text-[1.5rem] font-extrabold"
					style={{ borderColor: verdict.border, color: verdict.tone }}
				>
					<VeranaMark size={28} />
					{verdict.label}
				</div>
				<p
					className="mt-3.5 max-w-[34ch]"
					style={{ color: trust.isResolving || trust.trustStatus === 'TRUSTED' ? 'var(--vtc-sub)' : verdict.tone }}
				>
					{noteFor(trust)}
				</p>

				{showAsk && (
					<div
						className={`mt-6 rounded-[1.1rem] border-[1.5px] p-[1.1rem] ${trust.isCheckingAccreditation || trust.accredited === undefined
							? 'border-[var(--vtc-line)] bg-[var(--vtc-chip)]'
							: moot
								? 'border-[var(--vtc-warn-line)] bg-[var(--vtc-warn-soft)]'
								: trust.accredited
									? 'border-[var(--vtc-ok)] bg-[var(--vtc-ok-soft)]'
									: 'border-[var(--vtc-bad)] bg-[var(--vtc-bad-soft)]'
							}`}
					>
						<h3 className="mb-2 text-[0.8rem] font-extrabold uppercase tracking-[0.09em] text-[var(--vtc-sub)]">
							{trust.role === 'issuer' ? 'Offers you' : 'Asks you for'}
						</h3>
						<div className="text-[1.15rem] font-extrabold tracking-[-0.01em]">{trust.credentialName}</div>
						{trust.isCheckingAccreditation ? (
							<p className="mt-2.5 text-[var(--vtc-sub)]">Checking the Verana public registry…</p>
						) : trust.accredited === undefined ? (
							<p className="mt-2.5 text-[var(--vtc-sub)]">This could not be checked against the registry.</p>
						) : (
							<>
								<div className="mt-2.5 flex gap-2.5">
									<span className={`shrink-0 ${trust.accredited ? 'text-[var(--vtc-ok)]' : 'text-[var(--vtc-bad)]'}`}>
										{trust.accredited ? <Check size={19} strokeWidth={3} /> : <X size={17} strokeWidth={3} />}
									</span>
									<span>
										<em className="not-italic font-bold">{party}</em> is {trust.accredited ? 'an' : 'not an'} {verb} of{' '}
										<em className="not-italic font-bold">{trust.credentialName}</em>
									</span>
								</div>
								{moot && (
									<div className="mt-2.5 flex gap-2.5">
										<span className="shrink-0 text-[var(--vtc-warn)]">
											<X size={17} strokeWidth={3} />
										</span>
										<span className="font-semibold text-[var(--vtc-warn)]">
											…but nothing verifies who holds that DID, so the accreditation carries no weight.
										</span>
									</div>
								)}
							</>
						)}
					</div>
				)}

				{hasConditions && (
					<div
						className={`mt-6 rounded-[1.1rem] border p-[1.1rem] ${gated ? 'border-[var(--vtc-warn-line)] bg-[var(--vtc-warn-soft)]' : 'border-[var(--vtc-line)]'}`}
					>
						<h3
							className={`mb-3 text-[0.82rem] font-extrabold uppercase tracking-[0.09em] ${gated ? 'text-[var(--vtc-warn)]' : ''}`}
						>
							Conditions of connecting
						</h3>
						{typeof age === 'number' && (gated ? (
							<div className="flex items-center gap-2.5 py-1.5">
								<span className="shrink-0 rounded-lg border-[1.5px] border-[var(--vtc-warn-line)] px-2 py-0.5 font-extrabold text-[var(--vtc-warn)]">
									{age}+
								</span>
								<span>This service requires you to be at least {age} to connect</span>
							</div>
						) : (
							<div className="flex items-center gap-2.5 py-1.5 text-[var(--vtc-sub)]">
								<Clock size={19} />
								<span>No age restriction</span>
							</div>
						))}
						<AssetLink icon={<FileText size={19} />} label="Terms & conditions" href={trust.service?.termsUrl} />
						<AssetLink icon={<Shield size={19} />} label="Privacy policy" href={trust.service?.privacyUrl} />
					</div>
				)}
			</div>
		</div>
	);
};

export default VeranaTrustCard;
