import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useHttpProxy } from '@/lib/services/HttpProxy/HttpProxy';
import { VERANA_DEMO_SCENARIOS, VeranaDemoScenario, mintVeranaDemo } from '@/lib/services/Verana/veranaDemos';
import { VeranaRole } from '@/lib/services/Verana/veranaTrust';
import Button from '@/components/Buttons/Button';
import { H1, H2 } from '@/components/Shared/Heading';
import PageDescription from '@/components/Shared/PageDescription';

const VeranaDemos = () => {
	const { t } = useTranslation();
	const httpProxy = useHttpProxy();
	const [running, setRunning] = useState<string | null>(null);
	const [failed, setFailed] = useState<string | null>(null);

	const run = async (scenario: VeranaDemoScenario) => {
		setRunning(scenario.id);
		setFailed(null);
		const target = await mintVeranaDemo(httpProxy, scenario).catch(() => undefined);
		if (!target) {
			setFailed(scenario.id);
			setRunning(null);
			return;
		}
		window.location.assign(target);
	};

	const group = (role: VeranaRole) => (
		<div className="mt-6">
			<H2 heading={t(`pageVerana.${role}s`)} />
			{role === 'verifier' && (
				<p className="text-sm text-lm-gray-800 dark:text-dm-gray-200 mb-3">{t('pageVerana.needsCredential')}</p>
			)}
			<div className="grid gap-4 md:grid-cols-3">
				{VERANA_DEMO_SCENARIOS.filter((scenario) => scenario.role === role).map((scenario) => (
					<div
						key={scenario.id}
						className="flex flex-col justify-between rounded-lg border border-lm-gray-400 dark:border-dm-gray-600 p-4"
					>
						<div>
							<p className="font-semibold text-lm-gray-900 dark:text-dm-gray-100">{t(`pageVerana.scenarios.${scenario.id}.title`)}</p>
							<p className="text-sm text-lm-gray-800 dark:text-dm-gray-200 mt-2">{t(`pageVerana.scenarios.${scenario.id}.expected`)}</p>
							{failed === scenario.id && (
								<p className="text-sm text-lm-red dark:text-dm-red mt-2">{t('pageVerana.mintFailed')}</p>
							)}
						</div>
						<div className="mt-4">
							<Button
								id={`verana-demo-${scenario.id}`}
								variant="primary"
								disabled={running !== null}
								onClick={() => run(scenario)}
							>
								{running === scenario.id ? t('pageVerana.running') : t('pageVerana.run')}
							</Button>
						</div>
					</div>
				))}
			</div>
		</div>
	);

	return (
		<div className="px-6 sm:px-12 w-full">
			<H1 heading={t('pageVerana.title')} />
			<PageDescription description={t('pageVerana.description')} />
			{group('issuer')}
			{group('verifier')}
		</div>
	);
};

export default VeranaDemos;
