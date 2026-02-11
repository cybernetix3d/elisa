import { useState } from 'react';
import type { QuestionPayload } from '../../types';

interface Props {
  stepId: string;
  questions: QuestionPayload[];
  sessionId: string;
  onClose: () => void;
}

export default function SkillQuestionModal({ stepId, questions, sessionId, onClose }: Props) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(() => {
    const initial: Record<string, string | string[]> = {};
    for (let i = 0; i < questions.length; i++) {
      initial[i] = questions[i].multiSelect ? [] : '';
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSingleSelect = (qIndex: number, label: string) => {
    setAnswers(prev => ({ ...prev, [qIndex]: label }));
  };

  const handleMultiSelect = (qIndex: number, label: string) => {
    setAnswers(prev => {
      const current = (prev[qIndex] as string[]) || [];
      const next = current.includes(label)
        ? current.filter(l => l !== label)
        : [...current, label];
      return { ...prev, [qIndex]: next };
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const payload: Record<string, any> = {};
    for (let i = 0; i < questions.length; i++) {
      payload[questions[i].header] = answers[i];
    }

    await fetch(`/api/skills/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step_id: stepId, answers: payload }),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg mx-4 w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Skill needs your input</h2>

        {questions.map((q, qIndex) => (
          <div key={qIndex} className="mb-5">
            <p className="text-sm font-semibold text-gray-800 mb-2">{q.question}</p>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded mb-2 inline-block">
              {q.header}
            </span>

            <div className="space-y-2 mt-2">
              {q.options.map((opt) => {
                const isSelected = q.multiSelect
                  ? ((answers[qIndex] as string[]) || []).includes(opt.label)
                  : answers[qIndex] === opt.label;

                return (
                  <label
                    key={opt.label}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type={q.multiSelect ? 'checkbox' : 'radio'}
                      name={`q-${qIndex}`}
                      checked={isSelected}
                      onChange={() =>
                        q.multiSelect
                          ? handleMultiSelect(qIndex, opt.label)
                          : handleSingleSelect(qIndex, opt.label)
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium">{opt.label}</div>
                      {opt.description && (
                        <div className="text-xs text-gray-500">{opt.description}</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium text-sm disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
