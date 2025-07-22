import {
  APIGatewayAlarmConfig,
  LambdaFunctionAlarmConfig
} from '@ps-refarch/bff-api';
import { Duration } from 'aws-cdk-lib';

/**
 * Get a decent starting API Gateway alarm configuration. Teams may want to tweak this, but this
 * is a good initial alarm configuration.
 * @param props parameters
 * @returns the alarm configuration, ready to be passed into BFFApi/Api constructs or (with some minor
 * enriching) MonitoringFacade.monitorApiGateway.
 */
export function getAPIGatewayAlarmConfig(props: {
  /**
   * The normal namespace.
   */
  namespace: string;

  /**
   * Prefix to be used for overridden alarms, if any.
   */
  prefix: string;
}): APIGatewayAlarmConfig {
  if (props.namespace === 'int') {
    return {
      add4XXErrorRateAlarm: {
        Critical: {
          alarmDescriptionOverride: '4XX Error rate too high.',
          datapointsToAlarm: 1,
          maxErrorRate: 0.1,
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      },
      add5XXFaultRateAlarm: {
        Critical: {
          alarmDescriptionOverride: '5XX Error rate too high.',
          datapointsToAlarm: 1,
          maxErrorRate: 0.1,
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      },
      addLatencyP70Alarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxLatency: Duration.millis(1000),
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100,
          evaluateLowSampleCountPercentile: false
        }
      },
      addLatencyP90Alarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxLatency: Duration.millis(4000),
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100,
          evaluateLowSampleCountPercentile: false
        }
      },
      addLatencyP99Alarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxLatency: Duration.millis(8000),
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100,
          evaluateLowSampleCountPercentile: false
        }
      },
      addLatencyTM99Alarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxLatency: Duration.millis(1200),
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      }
    };
  }
  if (props.namespace === 'stgus') {
    return {
      add4XXErrorRateAlarm: {
        Critical: {
          alarmDescriptionOverride: '4XX Error rate too high.',
          datapointsToAlarm: 1,
          maxErrorRate: 0.1,
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      },
      add5XXFaultRateAlarm: {
        Critical: {
          alarmDescriptionOverride: '5XX Error rate too high.',
          datapointsToAlarm: 1,
          maxErrorRate: 0.1,
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      },
      addLatencyP70Alarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxLatency: Duration.millis(1000),
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100,
          evaluateLowSampleCountPercentile: false
        }
      },
      addLatencyP90Alarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxLatency: Duration.millis(4000),
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100,
          evaluateLowSampleCountPercentile: false
        }
      },
      addLatencyP99Alarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxLatency: Duration.millis(8000),
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100,
          evaluateLowSampleCountPercentile: false
        }
      },
      addLatencyTM99Alarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxLatency: Duration.millis(1200),
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      }
    };
  }
  if (props.namespace === 'produs') {
    return {
      add4XXErrorRateAlarm: {
        Critical: {
          alarmDescriptionOverride: '4XX Error rate too high.',
          datapointsToAlarm: 1,
          maxErrorRate: 0.1,
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      },
      // the 5XX error is an error we will check on for Pager Duty, having a 10% warning and a 35% critical (warning and critical are only two options)
      add5XXFaultRateAlarm: {
        Warning: {
          alarmDescriptionOverride: '5XX Error rate too high.',
          datapointsToAlarm: 1,
          maxErrorRate: 0.1,
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        },
        // This alert will be present in slack, but will also trigger a pager duty incident, b/c of the name beginning with pd
        Critical: {
          alarmNameOverride: `pd-${props.prefix}-APIGatewayError-5XXFault-Rate-Critical`,
          alarmDescriptionOverride: '5XX Error rate critical.',
          datapointsToAlarm: 1,
          maxErrorRate: 0.35,
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      },
      addLatencyP70Alarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxLatency: Duration.millis(1000),
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100,
          evaluateLowSampleCountPercentile: false
        }
      },
      addLatencyP90Alarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxLatency: Duration.millis(4000),
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100,
          evaluateLowSampleCountPercentile: false
        }
      },
      addLatencyP99Alarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxLatency: Duration.millis(8000),
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100,
          evaluateLowSampleCountPercentile: false
        }
      },
      addLatencyTM99Alarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxLatency: Duration.millis(1200),
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      }
    };
  }
  return {};
}

/**
 * Get a decent starting API Gateway lambda alarm configuration. Teams may want to tweak this, but this
 * is a good initial alarm configuration.
 * @param props parameters
 * @returns the alarm configuration, ready to be passed into BFFApi/Api constructs or (with some minor
 * enriching) MonitoringFacade.monitorLambdaFunction
 */
export function getLambdaFunctionAlarmConfig(props: {
  namespace: string;
}): LambdaFunctionAlarmConfig {
  if (props.namespace === 'int') {
    return {
      addFaultRateAlarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxErrorRate: 0.1,
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      },
      addConcurrentExecutionsCountAlarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxRunningTasks: 50,
          period: Duration.minutes(10)
        }
      },
      addEnhancedMonitoringMaxMemoryUtilizationAlarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxUsagePercent: 50,
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      }
    };
  }
  if (props.namespace === 'stgus') {
    return {
      addFaultRateAlarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxErrorRate: 0.1,
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      },
      addConcurrentExecutionsCountAlarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxRunningTasks: 50,
          period: Duration.minutes(10)
        }
      },
      addEnhancedMonitoringMaxMemoryUtilizationAlarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxUsagePercent: 50,
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      }
    };
  }
  if (props.namespace === 'produs') {
    return {
      addFaultRateAlarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxErrorRate: 0.1,
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      },
      addConcurrentExecutionsCountAlarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxRunningTasks: 50,
          period: Duration.minutes(10)
        }
      },
      addEnhancedMonitoringMaxMemoryUtilizationAlarm: {
        Critical: {
          datapointsToAlarm: 1,
          maxUsagePercent: 50,
          period: Duration.minutes(10),
          minMetricSamplesToAlarm: 100
        }
      }
    };
  }
  return {};
}
