import { MainAccountEnvProps } from './cdk/lib/main-stack-props';

/**
 * Account environment configuration for different deployment environments.
 * This file replaces the previous account-env.json file with proper TypeScript typing.
 */
const accountEnvProps: Record<string, MainAccountEnvProps> = {
  dev: {
    names: ['dev', 'copilot'],
    env: {
      account: '383701092366',
      region: 'us-east-1'
    },
    hostedZoneName: 'fileshare.powerschoolcorp.com',
    hostedZoneId: 'Z101939318FHK44H1H7O1',
    sharedServiceEnv: 'int',
    sessionTable: {
      account: '246597006913',
      envName: 'int',
      appCookieMappings: {
        'admin.powerschool.com': 'adminsessiontoken'
      }
    },
    isProduction: false,
    caching: false,
    // Product configurations for dev environment
    products: {
      // Performance Matters product configuration
      PM: {
        productCode: 'PM',
        name: 'Performance Matters',
        uses: [{ name: 'Scan' }, { name: 'QTI' }, { name: 'Enrollment' }],
        productPublicKey:
          'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDEQlHnKR0w+7zaJvdAZ+BQ6l+CXmV+YEAlBzfT+lYrwn8RePmXOgtu7TWc/+hMc5o+HO5iLA11eUsJKA6kA2DsUfLk9P3wJ+k+w3St7+GrQ4JlsNoUhdZlKzJ9Q6wl+T8w86//BIIgOftX+dcomVKIwUbLntHTKXHLS3NYNT9YcbSN5jKQipY1yKI6HKot2fXldB7jlmD1sas31pgnXZjEIIXp14vi9LFyFctUsSPvELFsweEZp/12pxO8YzvDSeoqHOUKD8tWb8USNXGvgrfh5l7pmAfcjs1Ai8+sB5bgn2L+Sy/MCWPdqYi5AsvSWmzcoMmFVf7H6RdCGxMWqAVpDu0RgT7DsZ6boMHd1E5bBq0jDqSFXsIVGg4bJUrV76YxjGh7+EcsRHHOv+zuI0T5olcwkN27jBwA6syisPMYh85MfzFx6aXlglDBC4SzESZxgQbbE+vkYFN1rtdc+pJdwuXdD7Zpwd4vDMl6ZE/flnbT3Hxuvi8iW+l/lsdYvxs=',
        multiTenant: true, // PM is a multi-tenant product
        accessAccounts: ['454155240835'],
        forwardEvents: ['676964220013'] // Chad's account
      },
      // QA product configuration for testing purposes
      QA: {
        productCode: 'QA',
        name: 'Quality Assurance Testing',
        uses: [{ name: 'Testing' }, { name: 'Integration' }],
        multiTenant: false, // QA is a single-tenant product for testing
        accessAccounts: ['383701092366'],
        forwardEvents: ['676964220013'] // Chad's account
      },
      // SIS product configuration for specific district settings testing purposes. Only used in dev environment.
      SIS: {
        productCode: 'SIS',
        name: 'PowerSchool SIS',
        uses: [{ name: 'Testing' }, { name: 'Integration' }],
        multiTenant: false, // QA is a single-tenant product for testing
        accessAccounts: ['383701092366']
      }
    }
  },
  int: {
    names: ['int'],
    env: {
      account: '383701092366',
      region: 'us-east-1'
    },
    hostedZoneName: 'fileshare.powerschoolcorp.com',
    hostedZoneId: 'Z101939318FHK44H1H7O1',
    sharedServiceEnv: 'int',
    sessionTable: {
      account: '246597006913',
      envName: 'int',
      appCookieMappings: {
        'admin.powerschool.com': 'adminsessiontoken'
      }
    },
    isProduction: false,
    caching: false,
    // Product configurations for int environment
    products: {
      PM: {
        productCode: 'PM',
        name: 'Performance Matters',
        uses: [{ name: 'Scan' }, { name: 'QTI' }, { name: 'Enrollment' }],
        productPublicKey:
          'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDEQlHnKR0w+7zaJvdAZ+BQ6l+CXmV+YEAlBzfT+lYrwn8RePmXOgtu7TWc/+hMc5o+HO5iLA11eUsJKA6kA2DsUfLk9P3wJ+k+w3St7+GrQ4JlsNoUhdZlKzJ9Q6wl+T8w86//BIIgOftX+dcomVKIwUbLntHTKXHLS3NYNT9YcbSN5jKQipY1yKI6HKot2fXldB7jlmD1sas31pgnXZjEIIXp14vi9LFyFctUsSPvELFsweEZp/12pxO8YzvDSeoqHOUKD8tWb8USNXGvgrfh5l7pmAfcjs1Ai8+sB5bgn2L+Sy/MCWPdqYi5AsvSWmzcoMmFVf7H6RdCGxMWqAVpDu0RgT7DsZ6boMHd1E5bBq0jDqSFXsIVGg4bJUrV76YxjGh7+EcsRHHOv+zuI0T5olcwkN27jBwA6syisPMYh85MfzFx6aXlglDBC4SzESZxgQbbE+vkYFN1rtdc+pJdwuXdD7Zpwd4vDMl6ZE/flnbT3Hxuvi8iW+l/lsdYvxs=',
        multiTenant: true, // PM is a multi-tenant product
        accessAccounts: ['454155240835'],
        permissions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket']
      },
      // QA product configuration for testing purposes
      QA: {
        productCode: 'QA',
        name: 'Quality Assurance Testing',
        uses: [{ name: 'Testing' }, { name: 'Integration' }],
        multiTenant: false, // QA is a single-tenant product for testing
        accessAccounts: ['383701092366']
      },
      // SIS product configuration for specific district settings testing purposes.
      SIS: {
        productCode: 'SIS',
        name: 'PowerSchool SIS',
        uses: [{ name: 'Testing' }, { name: 'Integration' }],
        multiTenant: false, // QA is a single-tenant product for testing
        accessAccounts: ['383701092366']
      }
    }
  },
  stgus: {
    names: ['stgus'],
    env: {
      account: '383701092366',
      region: 'us-east-1'
    },
    hostedZoneName: 'fileshare.powerschoolcorp.com',
    hostedZoneId: 'Z101939318FHK44H1H7O1',
    sharedServiceEnv: 'stgus',
    sessionTable: {
      account: '246597006913',
      envName: 'stgus',
      appCookieMappings: {
        'admin.powerschool.com': 'adminsessiontoken'
      }
    },
    isProduction: false,
    caching: false,
    // Product configurations for stgus environment
    products: {
      PM: {
        productCode: 'PM',
        name: 'Performance Matters',
        uses: [{ name: 'Scan' }, { name: 'QTI' }, { name: 'Enrollment' }],
        productPublicKey:
          'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDEQlHnKR0w+7zaJvdAZ+BQ6l+CXmV+YEAlBzfT+lYrwn8RePmXOgtu7TWc/+hMc5o+HO5iLA11eUsJKA6kA2DsUfLk9P3wJ+k+w3St7+GrQ4JlsNoUhdZlKzJ9Q6wl+T8w86//BIIgOftX+dcomVKIwUbLntHTKXHLS3NYNT9YcbSN5jKQipY1yKI6HKot2fXldB7jlmD1sas31pgnXZjEIIXp14vi9LFyFctUsSPvELFsweEZp/12pxO8YzvDSeoqHOUKD8tWb8USNXGvgrfh5l7pmAfcjs1Ai8+sB5bgn2L+Sy/MCWPdqYi5AsvSWmzcoMmFVf7H6RdCGxMWqAVpDu0RgT7DsZ6boMHd1E5bBq0jDqSFXsIVGg4bJUrV76YxjGh7+EcsRHHOv+zuI0T5olcwkN27jBwA6syisPMYh85MfzFx6aXlglDBC4SzESZxgQbbE+vkYFN1rtdc+pJdwuXdD7Zpwd4vDMl6ZE/flnbT3Hxuvi8iW+l/lsdYvxs=',
        multiTenant: true, // PM is a multi-tenant product
        accessAccounts: ['454155240835'],
        permissions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket']
      }
    }
  },
  produs: {
    names: ['produs'],
    env: {
      account: '294539077838',
      region: 'us-east-1'
    },
    hostedZoneName: 'fileshare.powerschool.com',
    hostedZoneId: 'Z014199036VX9BXIMRQVI',
    sharedServiceEnv: 'produs',
    sessionTable: {
      account: 'XXXXXXXXXXXXX',
      envName: 'produs',
      appCookieMappings: {
        'admin.powerschool.com': 'adminsessiontoken'
      }
    },
    isProduction: true,
    caching: false,
    // Product configurations for produs environment
    products: {
      PM: {
        productCode: 'PM',
        name: 'Performance Matters',
        uses: [{ name: 'Scan' }, { name: 'QTI' }, { name: 'Enrollment' }],
        productPublicKey:
          'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDEQlHnKR0w+7zaJvdAZ+BQ6l+CXmV+YEAlBzfT+lYrwn8RePmXOgtu7TWc/+hMc5o+HO5iLA11eUsJKA6kA2DsUfLk9P3wJ+k+w3St7+GrQ4JlsNoUhdZlKzJ9Q6wl+T8w86//BIIgOftX+dcomVKIwUbLntHTKXHLS3NYNT9YcbSN5jKQipY1yKI6HKot2fXldB7jlmD1sas31pgnXZjEIIXp14vi9LFyFctUsSPvELFsweEZp/12pxO8YzvDSeoqHOUKD8tWb8USNXGvgrfh5l7pmAfcjs1Ai8+sB5bgn2L+Sy/MCWPdqYi5AsvSWmzcoMmFVf7H6RdCGxMWqAVpDu0RgT7DsZ6boMHd1E5bBq0jDqSFXsIVGg4bJUrV76YxjGh7+EcsRHHOv+zuI0T5olcwkN27jBwA6syisPMYh85MfzFx6aXlglDBC4SzESZxgQbbE+vkYFN1rtdc+pJdwuXdD7Zpwd4vDMl6ZE/flnbT3Hxuvi8iW+l/lsdYvxs=',
        multiTenant: true, // PM is a multi-tenant product
        accessAccounts: ['027444825683'],
        permissions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket']
      }
    }
  }
};

export default accountEnvProps;
