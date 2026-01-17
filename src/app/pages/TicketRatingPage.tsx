import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { PageHeader } from '../layout/PageHeader';
import { Panel, Button } from '../components';
import { StarIcon } from '../components/Icons';

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
}

export function TicketRatingPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const supabase = getSupabaseClient();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadTicket() {
      if (!ticketId) return;

      const { data, error } = await supabase
        .from('tickets')
        .select('id, ticket_number, title, status, priority')
        .eq('id', ticketId)
        .single();

      if (error || !data) {
        console.error('Error loading ticket:', error);
        setLoading(false);
        return;
      }

      setTicket(data);
      setLoading(false);
    }

    loadTicket();
  }, [ticketId]);

  const handleSubmitRating = async () => {
    if (!ticket || rating === 0 || submitting) return;

    setSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user already rated this ticket
      const { data: existingRating } = await supabase
        .from('ticket_ratings')
        .select('*')
        .eq('ticket_id', ticket.id)
        .eq('rated_by', user.id)
        .single();

      if (existingRating) {
        alert('You have already rated this ticket.');
        setSubmitting(false);
        return;
      }

      // Submit rating
      const { error } = await supabase
        .from('ticket_ratings')
        .insert({
          ticket_id: ticket.id,
          rating,
          feedback: feedback.trim() || null,
          rated_by: user.id
        });

      if (error) {
        console.error('Error submitting rating:', error);
        alert('Failed to submit rating. Please try again.');
      } else {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center' }}>
        Loading...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ padding: 'var(--itsm-space-8)', textAlign: 'center' }}>
        <h2>Ticket not found</h2>
        <p>The ticket you're trying to rate could not be found.</p>
        <Button onClick={() => navigate('/my-tickets')}>
          Back to My Tickets
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ padding: 'var(--itsm-space-8)' }}>
        <PageHeader title="Thank You!" />
        <Panel>
          <div style={{ 
          textAlign: 'center', 
          padding: 'var(--itsm-space-8)',
          backgroundColor: 'var(--itsm-surface-primary)',
          borderRadius: 'var(--itsm-input-radius)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
            <h3>Rating Submitted</h3>
            <p>Thank you for your feedback! Your rating helps us improve our service.</p>
            <Button onClick={() => navigate('/my-tickets')}>
              Back to My Tickets
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--itsm-space-8)' }}>
      <PageHeader 
        title="Rate Your Experience"
        subtitle={`${ticket.ticket_number} - ${ticket.title}`}
      />

      <Panel>
        <div style={{ 
          maxWidth: 600, 
          margin: '0 auto', 
          padding: 'var(--itsm-space-8)',
          backgroundColor: 'var(--itsm-surface-primary)',
          borderRadius: 'var(--itsm-input-radius)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ marginBottom: 'var(--itsm-space-6)' }}>
            <h3>How would you rate the service you received?</h3>
            <p>Please rate your experience from 1 (very poor) to 5 (excellent).</p>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 'var(--itsm-space-4)', 
            marginBottom: 'var(--itsm-space-6)' 
          }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 32,
                  color: star <= rating ? '#fbbf24' : '#d1d5db',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (star > rating) {
                    e.currentTarget.style.color = '#fbbf24';
                  }
                }}
                onMouseLeave={(e) => {
                  if (star > rating) {
                    e.currentTarget.style.color = '#d1d5db';
                  }
                }}
              >
                <StarIcon size={32} fill={star <= rating} />
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 'var(--itsm-space-6)' }}>
            <label htmlFor="feedback" style={{ 
              display: 'block', 
              marginBottom: 'var(--itsm-space-2)', 
              fontWeight: 500 
            }}>
              Additional Feedback (Optional)
            </label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share any additional comments about your experience..."
              style={{
                width: '100%',
                minHeight: 120,
                padding: 'var(--itsm-space-3)',
                border: '1px solid var(--itsm-border-default)',
                borderRadius: 'var(--itsm-input-radius)',
                fontSize: 'var(--itsm-text-sm)',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--itsm-space-3)' }}>
            <Button
              variant="primary"
              onClick={handleSubmitRating}
              disabled={rating === 0 || submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/my-tickets')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
