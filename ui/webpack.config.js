const path = require('path');
const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;
const deps = require('./package.json').dependencies;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const mockData = require('./src/app/sample-data/sample-data.json');
const neonVersion = require('./package.json').neonVersion;
const neonVersionUnderscored = neonVersion.replaceAll('.', '_');
const ESLintPlugin = require('eslint-webpack-plugin');


// Someday we might want the features listed here:https://github.com/module-federation/module-federation-examples/issues/566
// The ExternalTemplatesRemotePlugin takes care of those issues.
// const ExternalTemplatesRemotePlugin = require('external-remotes-plugin');

//Start using webpack using the command `npx webpack serve`
module.exports = (env) => {
  const mode = env.mode || 'development';
  const port = env.port || 8002;
  const neonServer = env.neonServer || 'https://assets.powerschool.com';
  const neonUnversionedServer = `${neonServer}/neon/unversioned`;
  const neonVersionedServer = `${neonServer}/neon/${neonVersion}`;

  //Setting this to true means that the mfeInit function will inject
  //the MFE into the shadow-dom.
  const usesShadowDom = true;

  // this needs to be unique accross all of powerschool
  // https://powerschoolgroup.atlassian.net/wiki/spaces/INTDEVPORTAL/pages/64772735063/Micro-frontend+MFE+Catalog
  const MFE_NAME_SPACE_PREFIX = 'powerschool-ftp';

  return {
    mode,
    entry: './src/app/index.tsx',
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true
    },
    module: {
        rules: [
            {
              test: (fileName) => {
                if (/\.test\./.test(fileName)) {
                  return false;
                }

                return /\.tsx?$/.test(fileName);
              },
                use: [
                  'ts-loader',
                  {
                    loader: 'string-replace-loader',
                    options: {
                      multiple: [{
                        search: '__neon__',
                        replace: 'neon-' + neonVersionUnderscored + '-',
                        flags: 'g'
                      }, {
                        search: '__NEON_CDN_URL__',
                        replace: neonVersionedServer,
                        flags: 'g'
                      }, {
                        search: '__NEON_CDN_UN_VERSIONED__',
                        replace: neonUnversionedServer,
                        flags: 'g'
                      }, {
                        search: '__mfe__',
                        replace: 'mfe-' + MFE_NAME_SPACE_PREFIX + '-',
                        flags: 'g'
                      }, {
                        search: '__MFE_NAME_SPACE_PREFIX__',
                        replace: MFE_NAME_SPACE_PREFIX,
                        flags: 'g'
                      }]
                    }
                  }
                ],
                exclude: /node_modules/
            },
            {
              test: /\.scss$/i,
              use: [
                {
                  loader: 'style-loader',
                  options: usesShadowDom ? {
                    insert: (styleTagElement) => {
                      const remote = window['__MFE_NAME_SPACE_PREFIX__'.replace(/-/g, '_')];
                      if (remote != null) {
                        if (remote.styleTags == null) {
                          remote.styleTags = new Set();
                        }
                        remote.styleTags.add(styleTagElement);
                      } else {
                        document.head.appendChild(styleTagElement);
                      }
                    }
                  } : {}
                },
                // Translates CSS into CommonJS
                'css-loader',
                {
                  loader: 'string-replace-loader',
                  options: {
                    multiple: [{
                      search: '__neon__',
                      replace: 'neon-' + neonVersionUnderscored + '-',
                      flags: 'g'
                    }, {
                      search: '__mfe__',
                      replace: 'mfe-' + MFE_NAME_SPACE_PREFIX + '-',
                      flags: 'g'
                    }, {
                      search: '__MFE_NAME_SPACE_PREFIX__',
                      replace: MFE_NAME_SPACE_PREFIX,
                      flags: 'g'
                    }]
                  }
                },
                // Compiles Sass to CSS
                'sass-loader'
              ]
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.tx', '.js', '.ts']
    },
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist')
        },
        client: {
          overlay: {
            errors: true,
            warnings: false,
            runtimeErrors: (error) => {
              // This is an exception for the error boundary example page to prevent the overlay from constantly popping up
              if (error != null && error.message != null && (error.message.includes('REMOTE_ERROR') || error.message.includes('URL_ERROR') || error.message.includes('MODULE_ERROR'))) {
                return false;
              }

              return true;
            }
          }
        },
        port,
        historyApiFallback: true,
        setupMiddlewares: (middlewares, devServer) => {
            // Serve mock API data
            for (let mockApi of mockData) {
                devServer.app.get(mockApi.url, (_, res) => {
                    res.send(mockApi.payload);
                });
            }
            return middlewares;
        }
    },
    plugins: [
        //This one injects the javascript into the index.html page.
        new HtmlWebpackPlugin({
            template: './src/index.html'
        }),
        new ModuleFederationPlugin({
            //The name is going to be put on the global namespace of the browser. It is important to keep this unique across
            //PowerSchool to prevent namespace collisions. Please use the following pattern to name your MFE.
            //ps_mfe_{application-name}_{project-name or other information}

            name: MFE_NAME_SPACE_PREFIX.replace(/-/g, '_'),
            filename: 'remoteEntry.js',
            //We can assign the remoteEntry to a specific variable on the window if we want to.
            // library: {
            //     name: 'window.powerSchoolFederatedModules.sis',
            //     type: 'assign'
            // },
            exposes: {
                './powerschool-ftp': `./src/federated-modules/${MFE_NAME_SPACE_PREFIX}-main-module`
            },
            shared: {
              //DO NOT SHARE react-router-dom AT ALL. DO NOT DO IT.
              react: {singleton: false, eager: true, requiredVersion: deps.react},
              'react-dom': {singleton: false, eager: true, requiredVersion: deps['react-dom']}
            }
        }),
        new ESLintPlugin({
          fix: true,
          extensions: ['.ts', 'tsx']
        }),
    ]
  };
};