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
    const text = 'See https://github.com/obecker/causalist and http://aws.amazon.com/ etc';
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
          href="http://aws.amazon.com/"
          rel="noreferrer noopener"
          target="_blank"
          title=""
        >
          http://aws.amazon.com/
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

  it('will not parse urls with wrong protocol', () => {
    // when
    const { container } = render(<AutoLink text="hhttp://github.com or shttps://developer.mozilla.org/ or ftp://ftp.example.org" />);

    // then
    expect(container).toMatchInlineSnapshot(`
      <div>
        hhttp://github.com or shttps://developer.mozilla.org/ or ftp://ftp.example.org
      </div>
    `);
  });
});
