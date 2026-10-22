// Impressum (§ 5 TMG). Text as provided by the operator.
export const IMPRESSUM_TITLE = 'Impressum';

export default function Impressum() {
  return (
    <>
      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        Achim Benzel<br />
        Design by Achim Benzel<br />
        Saarstraße 32<br />
        55768 Hoppstädten-Weiersbach
      </p>

      <h2>Kontakt</h2>
      <p>
        Tel: <a href="tel:+491639877331">+49 163 9877331</a><br />
        E-Mail: <a href="mailto:info@achimbenzel.com">info@achimbenzel.com</a>
      </p>

      <h2>Umsatzsteuer-ID</h2>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
        DE366404174
      </p>

      <h2>Angaben zur Berufshaftpflichtversicherung</h2>
      <p>
        <strong>Name und Sitz des Versicherers:</strong> Markel Insurance SE<br />
        Sophienstr. 26, 80333 München<br />
        Tel: <a href="tel:+4989205094000">+49 89 205094-000</a> / <a href="mailto:service@markel.de">service@markel.de</a> /{' '}
        <a href="https://www.markel.de" target="_blank" rel="noopener noreferrer">www.markel.de</a>
      </p>
      <p><strong>Geltungsraum der Versicherung:</strong> Deutschland</p>

      <h2>Kleinunternehmerregelung</h2>
      <p>Gemäß § 19 UStG wird keine Umsatzsteuer erhoben (Kleinunternehmerstatus).</p>

      <h2>Redaktionell verantwortlich</h2>
      <p>Achim Benzel</p>

      <h2>Verbraucherstreitbeilegung/ Universalschlichtungsstelle</h2>
      <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
    </>
  );
}
