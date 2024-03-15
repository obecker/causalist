import { render } from '@testing-library/react';
import AutoLink from '../src/AutoLink';

describe('AutoLink', () => {
  it('renders simple text', () => {
    // when
    const { container } = render(<AutoLink text="This is just text" />);

    // then
    expect(container).toMatchInlineSnapshot(`
      <div>
        This is just text
      </div>
    `);
  });

  it('parses a single url', () => {
    // when
    const { container } = render(<AutoLink text="https://github.com/obecker/causalist" />);

    // then
    expect(container).toMatchInlineSnapshot(`
      <div>
        <a
          href="https://github.com/obecker/causalist"
          rel="noreferrer noopener"
          target="_blank"
          title=""
        >
          https://github.com/obecker/causalist
        </a>
      </div>
    `);
  });

  it('parses text with multiple urls and specific link classes', () => {
    // when
    const text = 'See https://github.com/obecker/causalist and https://aws.amazon.com/ etc';
    const { container } = render(<AutoLink text={text} linkClassName="underline" />);

    // then
    expect(container).toMatchInlineSnapshot(`
      <div>
        See 
        <a
          class="underline"
          href="https://github.com/obecker/causalist"
          rel="noreferrer noopener"
          target="_blank"
          title=""
        >
          https://github.com/obecker/causalist
        </a>
         and 
        <a
          class="underline"
          href="https://aws.amazon.com/"
          rel="noreferrer noopener"
          target="_blank"
          title=""
        >
          https://aws.amazon.com/
        </a>
         etc
      </div>
    `);
  });

  it('will not parse urls without protocol', () => {
    // when
    const { container } = render(<AutoLink text="github.com or developer.mozilla.org" />);

    // then
    expect(container).toMatchInlineSnapshot(`
      <div>
        github.com or developer.mozilla.org
      </div>
    `);
  });
});
