/**
 * GeoTwin 360 - Mock Gemini Provider
 *
 * Provides simulated Google Gemini API responses for development,
 * integration testing, and local verification without consuming quota or contacting Google.
 *
 * Implements 9 explicit scenarios:
 * 1. Successful response (structured JSON tailored for Advisor, Solutions, and Predictions)
 * 2. 429 Daily Quota Exhaustion
 * 3. 429 Transient Rate Limit (RPM)
 * 4. 503 Service Unavailable / Model Overloaded
 * 5. 401 Invalid API Key
 * 6. 403 Permission Denied
 * 7. Request Timeout
 * 8. Network Connectivity Failure (ECONNREFUSED / fetch failed)
 * 9. Malformed / Unparseable Response
 */

export type MockScenario =
  | 'success'
  | 'daily_quota_429'
  | 'rate_limit_429'
  | 'service_unavailable_503'
  | 'invalid_key_401'
  | 'permission_denied_403'
  | 'timeout'
  | 'network_failure'
  | 'malformed_response';

export class MockGeminiProvider {
  private static activeScenario: MockScenario = 'success';
  private static customPayload: any = null;

  /**
   * Configures the scenario to simulate on subsequent calls.
   */
  public static setScenario(scenario: MockScenario, customPayload: any = null): void {
    this.activeScenario = scenario;
    this.customPayload = customPayload;
  }

  /**
   * Resets the mock provider to default successful operation.
   */
  public static reset(): void {
    this.activeScenario = 'success';
    this.customPayload = null;
  }

  /**
   * Returns current active scenario.
   */
  public static getScenario(): MockScenario {
    return this.activeScenario;
  }

  /**
   * Simulates generation of content without any outbound network I/O.
   */
  public static async generateContent(options: {
    purpose: string;
    model?: string;
    contents: any;
    systemInstruction?: string;
    responseMimeType?: string;
  }): Promise<{ text: string }> {
    const scenario = this.activeScenario;

    switch (scenario) {
      case 'daily_quota_429': {
        const err: any = new Error(
          'You exceeded your current quota, please check your plan and billing details. Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash'
        );
        err.status = 429;
        err.statusCode = 429;
        err.code = 429;
        throw err;
      }

      case 'rate_limit_429': {
        const err: any = new Error(
          'Resource has been exhausted (e.g. check quota) - Rate limit exceeded: 5 requests per minute'
        );
        err.status = 429;
        err.statusCode = 429;
        err.code = 429;
        throw err;
      }

      case 'service_unavailable_503': {
        const err: any = new Error('The model is overloaded. Please try again later. ServiceUnavailable');
        err.status = 503;
        err.statusCode = 503;
        err.name = 'ServiceUnavailable';
        err.error = { status: 'UNAVAILABLE' };
        throw err;
      }

      case 'invalid_key_401': {
        const err: any = new Error('API key not valid. Please pass a valid API key.');
        err.status = 401;
        err.statusCode = 401;
        throw err;
      }

      case 'permission_denied_403': {
        const err: any = new Error('The caller does not have permission');
        err.status = 403;
        err.statusCode = 403;
        throw err;
      }

      case 'timeout': {
        const err = new Error('Gemini API call timed out after 15000ms');
        throw err;
      }

      case 'network_failure': {
        const err: any = new TypeError('fetch failed');
        err.message = 'fetch failed: connect ECONNREFUSED 142.250.180.202:443';
        err.cause = { code: 'ECONNREFUSED' };
        throw err;
      }

      case 'malformed_response': {
        return {
          text: '<<<MALFORMED_NON_JSON_GEMINI_OUTPUT_FOR_TESTING>>>',
        };
      }

      case 'success':
      default: {
        if (this.customPayload) {
          return {
            text: typeof this.customPayload === 'string'
              ? this.customPayload
              : JSON.stringify(this.customPayload),
          };
        }

        const purpose = (options.purpose || '').toLowerCase();

        // 1. Solution Personalization Mock Response
        if (purpose.includes('solution')) {
          return {
            text: JSON.stringify({
              executiveSummary: 'Localized climate adaptation priority focuses on integrated urban drainage and resilient energy distribution.',
              strategicRoadmap: [
                'Immediate (0-2 yrs): Early warning telemetry deployment and public cool-shelter retrofits.',
                'Medium-term (2-5 yrs): Vegetated bioswales, cool roofs, and decentralized microgrid installations.',
                'Long-term (5-15 yrs): Comprehensive watershed restoration and sea-wall reinforcement.',
              ],
              policyRecommendation: 'Adopt resilient building bylaws and mandate permeable surface quotas for commercial zones.',
            }),
          };
        }

        // 2. Prediction Interpretation Mock Response
        if (purpose.includes('prediction') || purpose.includes('climate interpretation')) {
          return {
            text: JSON.stringify({
              narrativeSummary: 'Statistical warming trend observed with heightened convective precipitation frequency across mid-century horizons.',
              trendEvaluation: 'Temperature anomalies exceed historic 1991-2020 climatological baselines across all scenarios.',
              riskImplications: [
                'Higher cooling degree days impacting municipal power grid capacity.',
                'Increased localized flood probability during peak monsoon events.',
              ],
              uncertaintyFactors: [
                'Variability in radiative forcing scenarios and local topographic microclimates.',
              ],
            }),
          };
        }

        // 3. Advisor Recommendations Mock Response (Default matches advisorResponseZodSchema)
        return {
          text: JSON.stringify({
            climateExplanation: 'Simulated climate evaluation shows temperature anomaly elevation and intensified precipitation under selected horizon.',
            mainRisks: [
              'Intense convective precipitation causing urban stormwater overload.',
              'Urban heat island amplification during summer heatwave cycles.',
            ],
            riskSignificance: 'Municipal critical infrastructure requires proactive adaptation measures within this planning window.',
            recommendedActions: [
              {
                title: 'Bioswale Stormwater Infiltration Network',
                priority: 'HIGH',
                reason: 'Mitigate peak runoff volume during intense convective precipitation events.',
                targetRisks: ['Urban flooding', 'Stormwater overload'],
                expectedImpact: 'Reduces localized surface runoff by up to 35 percent.',
                nextStep: 'Initiate municipal catchment elevation and drainage survey.',
              },
              {
                title: 'Reflective Cool Pavement Retrofit',
                priority: 'MEDIUM',
                reason: 'Mitigate localized ambient temperature increases in high-density corridors.',
                targetRisks: ['Extreme heat', 'Urban heat island'],
                expectedImpact: 'Reduces surface thermal radiation by 2.5 degrees Celsius.',
                nextStep: 'Target primary commercial transit arteries for cool coating application.',
              },
              {
                title: 'Early Warning Telemetry Network',
                priority: 'LOW',
                reason: 'Provide real-time flood alerting for flood-prone neighborhoods.',
                targetRisks: ['Flash flood vulnerability'],
                expectedImpact: 'Increases evacuation lead time by 45 minutes.',
                nextStep: 'Install ultrasonic water level sensors across major drainage culverts.',
              },
            ],
            shortTermRecommendations: [
              'Bioswale Stormwater Infiltration Network',
              'Reflective Cool Pavement Retrofit',
            ],
            longTermRecommendations: [
              'Early Warning Telemetry Network',
            ],
            confidenceLimitations: 'Synthesized under test mock provider environment without live API consumption.',
            dataDistinction: {
              suppliedData: ['Verified ERA5 baseline', 'NASA POWER temperature telemetry'],
              calculatedValues: ['Multi-hazard composite risk score: 62'],
              assumptions: ['Shared Socioeconomic Pathway 2-4.5 intermediate radiative forcing'],
              recommendations: ['Decentralized urban sponge infrastructure implementation'],
            },
          }),
        };
      }
    }
  }
}
