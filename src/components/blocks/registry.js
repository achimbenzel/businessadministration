// Block type → its View (read mode) and Edit (admin) components.
import { TextView, TextEdit, HeadingView, HeadingEdit, ListView, ListEdit, QuoteView, QuoteEdit, DividerView, DividerEdit } from './TextBlocks.jsx';
import { DefinitionView, DefinitionEdit, CalloutView, CalloutEdit, ToggleView, ToggleEdit, FormulaView, FormulaEdit } from './LearnBlocks.jsx';
import { FlashcardView, FlashcardEdit, QuizView, QuizEdit } from './QuizBlocks.jsx';
import { ImageView, ImageEdit, FilesView, FilesEdit, LinksView, LinksEdit } from './MediaBlocks.jsx';
import { TableView, TableEdit } from './TableBlock.jsx';
import { SupplyDemandView, SupplyDemandEdit, ConsumerChoiceView, ConsumerChoiceEdit } from './DemoBlocks.jsx';
import { SlidesView, SlidesEdit } from './SlidesBlock.jsx';

export const BLOCKS = {
  text: { View: TextView, Edit: TextEdit },
  heading: { View: HeadingView, Edit: HeadingEdit },
  list: { View: ListView, Edit: ListEdit },
  quote: { View: QuoteView, Edit: QuoteEdit },
  divider: { View: DividerView, Edit: DividerEdit },
  definition: { View: DefinitionView, Edit: DefinitionEdit },
  callout: { View: CalloutView, Edit: CalloutEdit },
  toggle: { View: ToggleView, Edit: ToggleEdit },
  formula: { View: FormulaView, Edit: FormulaEdit },
  slides: { View: SlidesView, Edit: SlidesEdit },
  flashcard: { View: FlashcardView, Edit: FlashcardEdit },
  quiz: { View: QuizView, Edit: QuizEdit },
  table: { View: TableView, Edit: TableEdit },
  image: { View: ImageView, Edit: ImageEdit },
  files: { View: FilesView, Edit: FilesEdit },
  links: { View: LinksView, Edit: LinksEdit },
  supplyDemand: { View: SupplyDemandView, Edit: SupplyDemandEdit },
  consumerChoice: { View: ConsumerChoiceView, Edit: ConsumerChoiceEdit },
};
