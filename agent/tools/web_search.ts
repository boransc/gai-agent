/**
 * Searching the web is how an agent invents a price. Every figure this agent gives a customer must come from the business config, and the direct Google provider cannot run the gateway-backed search tool anyway.
 */
import { disableTool } from "eve/tools";

export default disableTool();
