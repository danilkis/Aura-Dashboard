import React, { CSSProperties } from 'react';
import { Todo, Email, CustomWidgetConfig } from './types';
import Clock from './components/Clock';
import WeatherDisplay from './components/WeatherDisplay';
import { MailPreviewCard } from './components/MailSummary';
import TodoList from './components/TodoList';
import CustomWidget from './components/CustomWidget';

type Widget = 'clock' | 'weather' | 'mail' | 'todo';
type WidgetMap = {
    [key in 'a1' | 'a2' | 'a3' | 'b1']: Widget;
};

interface DashboardViewProps {
    widgetMap: WidgetMap;
    widgetStyles: Record<Widget, CSSProperties>;
    todos: Todo[];
    emails: Email[];
    customWidgets: CustomWidgetConfig[];
    onToggleTodo: (id: number) => void;
    onDeleteTodo: (id: number) => void;
    onUpdateMail: (id: number, read: boolean) => void;
    onBackgroundGenerated: (data: { backgroundUrl: string; accentColor: string }) => void;
    modelName: string;
    imageGenerationEnabled: boolean;
    onRemoveWidget: (title: string) => void;
    lightOn: boolean;
    setLightOn: (on: boolean) => void;
    speakerPlaying: boolean;
    setSpeakerPlaying: (playing: boolean) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
    widgetMap,
    widgetStyles,
    todos,
    emails,
    customWidgets,
    onToggleTodo,
    onDeleteTodo,
    onUpdateMail,
    onBackgroundGenerated,
    modelName,
    imageGenerationEnabled,
    onRemoveWidget,
    lightOn,
    setLightOn,
    speakerPlaying,
    setSpeakerPlaying
}) => {
    const renderWidget = (widget: Widget) => {
        const style = widgetStyles[widget];
        switch (widget) {
            case 'clock':
                return <div className="card-style flex items-center justify-center p-6 h-full"><Clock style={style}/></div>;
            case 'weather':
                return <WeatherDisplay onBackgroundGenerated={onBackgroundGenerated} style={style} modelName={modelName} imageGenerationEnabled={imageGenerationEnabled} />;
            case 'mail':
                return <MailPreviewCard emails={emails} onUpdate={onUpdateMail} style={style} />;
            case 'todo':
                return <TodoList todos={todos} onToggle={onToggleTodo} onDelete={onDeleteTodo} style={style} />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 flex flex-col h-full">
            <div className='flex-shrink-0'>
                <div className="flex flex-col xl:flex-row gap-6">
                    {/* Left/Main content area */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 md:row-span-2 min-h-[16rem]">
                        {renderWidget(widgetMap.a1)}
                        </div>
                        <div className="min-h-[8rem]">
                            {renderWidget(widgetMap.a2)}
                        </div>
                        <div className="min-h-[8rem]">
                            {renderWidget(widgetMap.a3)}
                        </div>
                    </div>

                    {/* Right/Sidebar content area */}
                    <div className="w-full xl:w-[26rem] xl:flex-shrink-0 min-h-[24rem] xl:min-h-0">
                        {renderWidget(widgetMap.b1)}
                    </div>
                </div>
            </div>

            {/* Custom Widgets Section */}
            {customWidgets.length > 0 && (
                <div className="mt-8 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-[--primary-text-color] mb-4">My Widgets</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {customWidgets.map((widget, index) => (
                            <CustomWidget
                                key={`${widget.title.replace(/\s/g, '-')}-${index}`}
                                config={widget}
                                onRemove={() => onRemoveWidget(widget.title)}
                                modelName={modelName}
                                smartHomeState={{
                                    light: { on: lightOn, setOn: setLightOn },
                                    speaker: { on: speakerPlaying, setOn: setSpeakerPlaying }
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardView;
