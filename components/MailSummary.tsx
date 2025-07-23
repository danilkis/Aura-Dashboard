import React from 'react';
import { Email } from '../types';
import { X } from 'lucide-react';

interface MailPreviewCardProps {
    emails: Email[];
    onUpdate: (id: number, read: boolean) => void;
    style?: React.CSSProperties;
}

export const MailPreviewCard: React.FC<MailPreviewCardProps> = ({ emails, onUpdate, style }) => {
    const recentEmails = emails.slice(0, 5);

    return (
        <div className="card-style p-4 flex flex-col h-full" style={style}>
            <h3 className="text-md font-bold text-[--primary-text-color] mb-3 flex-shrink-0">Inbox</h3>
            {recentEmails.length > 0 ? (
                 <div className="flex-grow flex flex-col space-y-2 overflow-y-auto -mr-2 pr-2">
                    {recentEmails.map(email => (
                        <div key={email.id} className="bg-[--input-bg-color] p-2.5 rounded-lg flex-shrink-0 cursor-pointer group hover:bg-[--bg-hover-color]" onClick={() => onUpdate(email.id, !email.read)}>
                            <div className="flex justify-between items-center mb-0.5">
                                <p className="font-semibold text-sm text-[--primary-text-color] truncate">{email.sender}</p>
                                {!email.read && (
                                    <span className="w-2 h-2 bg-[--accent-color] rounded-full flex-shrink-0 ml-2"></span>
                                )}
                            </div>
                            <p className="text-[--secondary-text-color] text-sm font-medium leading-tight truncate">{email.subject}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-[--secondary-text-color] text-sm">Inbox is empty.</p>
                </div>
            )}
        </div>
    );
}

interface MailSummaryProps {
    emails: Email[];
    onUpdate: (id: number, read: boolean) => void;
    onDelete: (id: number) => void;
}

const MailSummary: React.FC<MailSummaryProps> = ({ emails, onUpdate, onDelete }) => {
    return (
        <div className="p-4 md:p-8 h-full flex flex-col">
            <h1 className="text-3xl font-bold text-[--primary-text-color] mb-6 flex-shrink-0 drop-shadow-lg">Inbox</h1>
            <div className="flex-grow space-y-5 overflow-y-auto pr-2">
                {emails.map(email => (
                    <div key={email.id} className="card-style p-4 cursor-pointer hover:border-[--accent-color]/30 transition-colors group relative">
                        <div onClick={() => onUpdate(email.id, !email.read)}>
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-[--primary-text-color]">{email.sender}</p>
                                {!email.read && <span className="w-2.5 h-2.5 bg-[--accent-color] rounded-full flex-shrink-0"></span>}
                            </div>
                            <p className="text-[--primary-text-color] font-medium mt-1">{email.subject}</p>
                            <p className="text-[--secondary-text-color] text-sm mt-1">{email.snippet}</p>
                        </div>
                        <button onClick={() => onDelete(email.id)} className="absolute top-3 right-3 p-1 rounded-full bg-[--bg-hover-color] text-[--secondary-text-color] hover:text-[--danger-color] opacity-0 group-hover:opacity-100 transition-all">
                           <X className="w-5 h-5" />
                        </button>
                    </div>
                ))}
                 {emails.length === 0 && (
                    <div className="text-center text-[--secondary-text-color] pt-16">
                        <p>All caught up!</p>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default MailSummary;