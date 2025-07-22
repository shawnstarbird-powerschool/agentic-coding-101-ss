//Ok, so this was a pretty weird hack. This is the entry point into the package webpack creates.
//By using the import function on bootstrap, somehow the Federated Module code comes into play correctly.
//https://stackoverflow.com/questions/66123283/webpack-module-federation-is-not-working-with-eager-shared-libs/68970974#68970974

import('./bootstrap');