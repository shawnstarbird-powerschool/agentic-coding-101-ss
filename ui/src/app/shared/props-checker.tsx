import {NeonAccordion, NeonSystemMessage, NeonJsObject} from '@ps-refarch-ux/neon';
import React, {ReactElement} from 'react';
/**
 * The purpose of the props checker is to make sure that the data that is supposed to be
 * threaded through from the application-starter-pack makes it into the individual
 * pages.
 */
export function PropsChecker(props: any): ReactElement {

  if (props.serverConfig == null ||
      props.exampleContextInfoStarterPack1 == null ||
      props.exampleContextInfoStarterPack2 == null ||
      props.exampleContextInfoStarterPack3 == null
    ) {
    //We want to really make this look wrong if it's broken so devs will investigate
    const arrayOfErrors: Array<ReactElement> = [];
    for (let i = 0; i < 25; i++) {
      arrayOfErrors.push(<NeonSystemMessage
        id={'__mfe__system-message-info' + i}
        key={'key-' + i}
        dataType="error"
      >
        <p data-slot="message-content">
          Something went wrong with the props being passed into the MFE
          {props.serverConfig == null ? ' props.serverConfig == null' : ''}
          {props.exampleContextInfoStarterPack1 == null ? ' props.exampleContextInfoStarterPack1 == null' : ''}
          {props.exampleContextInfoStarterPack2 == null ? ' props.exampleContextInfoStarterPack2 == null' : ''}
          {props.exampleContextInfoStarterPack3 == null ? ' props.exampleContextInfoStarterPack3 == null' : ''}
        </p>
      </NeonSystemMessage>);
    }
    return <>
      <h2>Something Went Wrong With Passing Props</h2>
      <p>
        The starter pack needs to show off that props are
        threaded through to the mfes and some of them aren't
        getting passed in.  Look at props-checker.tsx to see
        what it expects and investigate why they aren't making it
        into the component.
      </p>
      <p>
        Note: There are a whole lot of error messages showing up to make the
        developer notice that there is something wrong.
      </p>
      {arrayOfErrors}
      <pre><p>{JSON.stringify(props, null, 2)}</p></pre>
    </>;
  }

  return <>
    <NeonAccordion
      id="props-checker"
      dataHeading="Props passed into the component"
      data-dataBorderType="bottom"
      dataSize="small"
    >
      <div>
        <NeonJsObject value={props} />
      </div>
    </NeonAccordion>
  </>;
}