import { AlertTriangle, ClipboardList, MapPin, Save, X } from "lucide-react";

const parseClockTime = (value) => {
  if (typeof value !== "string") return null;
  const text = value.trim().toUpperCase();
  if (!text) return null;

  const ampmMatch = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const minute = Number(ampmMatch[2]);
    const meridiem = ampmMatch[3];
    if (hour === 12) hour = 0;
    if (meridiem === "PM") hour += 12;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return hour * 60 + minute;
    return null;
  }

  const twentyFourMatch = text.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    const hour = Number(twentyFourMatch[1]);
    const minute = Number(twentyFourMatch[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return hour * 60 + minute;
  }
  return null;
};

const toDefaultTimeInput = (value) => {
  const minutes = parseClockTime(value);
  if (minutes === null) return "14:00";
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

export default function AddCalendarEvent({
  isOpen,
  form,
  modules = [],
  conflictingEvent,
  timeRangeError,
  error,
  onClose,
  onFieldChange,
  onSubmit,
}) {
  if (!isOpen) return null;

  return (
    <div className="quickadd-overlay" role="dialog" aria-modal="true" aria-label="Add Timetable Entry">
      <div className="quickadd-modal">
        <div className="quickadd-header">
          <div className="quickadd-title-wrap">
            <div className="quickadd-title-icon">
              <ClipboardList size={18} />
            </div>
            <div>
              <h3>Add Timetable Entry</h3>
              <p>Create a new academic session or study block</p>
            </div>
          </div>
          <button type="button" className="quickadd-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form className="quickadd-body" onSubmit={onSubmit}>
          {conflictingEvent ? (
            <div className="quickadd-warning">
              <AlertTriangle size={16} />
              <div>
                <strong>Schedule Conflict</strong>
                <p>
                  This entry overlaps with "{conflictingEvent.title}".
                </p>
              </div>
            </div>
          ) : null}

          <div className="quickadd-grid">
            <div className="quickadd-field quickadd-field-full">
              <label>Subject or Session Name</label>
              <input
                type="text"
                placeholder="e.g. Data Structures (CS201)"
                value={form.title}
                onChange={(e) => onFieldChange("title", e.target.value)}
                required
              />
            </div>

            <div className="quickadd-field">
              <label>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => onFieldChange("date", e.target.value)}
                required
              />
            </div>

            <div className="quickadd-field">
              <label>Venue / Room</label>
              <div className="quickadd-input-icon">
                <MapPin size={14} />
                <input
                  type="text"
                  placeholder="e.g. Library Wing A"
                  value={form.venue}
                  onChange={(e) => onFieldChange("venue", e.target.value)}
                />
              </div>
            </div>

            <div className="quickadd-field">
              <label>Start Time</label>
              <input
                type="time"
                value={toDefaultTimeInput(form.startTime)}
                onChange={(e) => onFieldChange("startTime", e.target.value)}
                required
              />
            </div>

            <div className="quickadd-field">
              <label>End Time</label>
              <input
                type="time"
                className={timeRangeError ? "input-error" : ""}
                value={toDefaultTimeInput(form.endTime)}
                onChange={(e) => onFieldChange("endTime", e.target.value)}
                required
              />
              {timeRangeError ? <p className="quickadd-inline-error">{timeRangeError}</p> : null}
            </div>

            <div className="quickadd-field quickadd-field-full">
              <label>Category</label>
              <select value={form.type} onChange={(e) => onFieldChange("type", e.target.value)}>
                <option value="study">Study Session</option>
                <option value="personal">Personal</option>
              </select>
            </div>

            {form.type !== "personal" ? (
              <div className="quickadd-field quickadd-field-full">
                <label>Module</label>
                <select
                  value={form.moduleId}
                  onChange={(e) => onFieldChange("moduleId", e.target.value)}
                  required
                >
                  <option value="">Select Module</option>
                  {modules.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.moduleCode} - {item.moduleName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="quickadd-field quickadd-field-full">
              <label>Additional Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Materials to bring, group members, etc."
                value={form.notes}
                onChange={(e) => onFieldChange("notes", e.target.value)}
              />
            </div>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="quickadd-footer">
            <button type="button" className="quickadd-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="quickadd-save">
              <Save size={14} />
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
