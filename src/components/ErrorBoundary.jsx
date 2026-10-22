// One per page: an error while rendering shows a message instead of a white screen.
import { Component } from 'react';
import { TriangleAlert, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error(error, info?.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="empty">
        <TriangleAlert size={30} />
        <h3>Diese Seite konnte nicht angezeigt werden</h3>
        <p>{String(this.state.error?.message || this.state.error)}</p>
        <button className="btn" onClick={() => this.setState({ error: null })}><RotateCcw size={16} /> Erneut versuchen</button>
      </div>
    );
  }
}
