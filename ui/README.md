# MFE Starter Pack

## How To Run
`npm run dev` runs the Micro Frontend on port 8002 for a dev server.
`npm run prod` runs the Micro Frontend on port 8002 with minified code for a dev server.
`npm run artifacts` builds the Micro Frontend for production and does not start the dev server.

## CSS rules
A micro frontend can be injected into the shell or into another micro frontend.  In order to prevent
styles from conflicting with other micro frontends on the page, you MUST employ some method of scoping.
Also, the classes used for scoping must have some sort of naming which will prevent you from using the
same names as some other micro frontend.

Here are some examples of things you *cannot* do.


>  //Styling a button unscoped like this will make buttons in other micro-frontends blue.
>
>  button {
>    background-color: blue;
>  }

>  //Styling an anchor unscoped like this will make anchors in other micro-frontends green.
>
>  a {
>    color: green;
>  }

>  //The class name for this is too generic. It's very possible another micro frontend might use a class called apply-button.
>
>  .apply-button {
>    color: green;
>  }

Here are some examples of things you *can* do.

.my-special-button {
    background-color: blue;
}


###
Ways to scope:
1. The easiest way is to only write styles against classes.
2. Use a class on your MicroFrontend's outermost tag and then use SASS to scope all elements under that class.  Note: This only works if you are not going to inject other micro frontends into your own micro frontend.
3. Use classes to scope blocks inside your code.


