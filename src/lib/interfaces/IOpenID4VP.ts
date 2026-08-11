import { ExtendedVcEntity } from "@/context/CredentialsContext";
import { ParsedTransactionData } from "../services/OpenID4VP/TransactionData/parseTransactionData";
import { VeranaCounterparty } from "../services/Verana/useVeranaTrust";

export type SendAuthorizationResponseResult =
	{
		state: "skipped" | "success";
		redirect_uri?: string;
	};

export interface IOpenID4VP {
	handleAuthorizationRequest(
		url: string,
		vcEntitylist: ExtendedVcEntity[],
	): Promise<{
		conformantCredentialsMap: Map<string, any>,
		verifierDomainName: string,
		verifierPurpose: string,
		parsedTransactionData: ParsedTransactionData[] | null,
		verana?: VeranaCounterparty,
	}>;
	promptForCredentialSelection(
		conformantCredentialsMap: { [x: string]: number[] },
		verifierDomainName: string,
		verifierPurpose: string,
		parsedTransactionData?: ParsedTransactionData[],
		verana?: VeranaCounterparty,
	): Promise<Map<string, number>>;
	sendAuthorizationResponse(
		selectionMap: Map<string, number>,
		vcEntitylist: ExtendedVcEntity[],
	): Promise<SendAuthorizationResponseResult>;
}
